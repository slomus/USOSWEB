package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	messagingpb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/cache"
	cryptoutil "github.com/slomus/USOSWEB/src/backend/pkg/crypto"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

var authLog = logger.NewLogger("auth-service")

// AuthServer implementuje zarówno AuthService jak i AuthHello
type AuthServer struct {
	pb.UnimplementedAuthServiceServer
	pb.UnimplementedAuthHelloServer
	db     *sql.DB
	cache  cache.Cache
	config *cache.CacheConfig
	logger *logger.Logger
}

// TokenContext reprezentuje kontekst tokena
type TokenContext struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int32
}

// User represents user data for cache
type User struct {
	ID       int64  `json:"id"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Active   bool   `json:"active"`
}

// Session represents user session for cache
type Session struct {
	Token     string    `json:"token"`
	UserID    int64     `json:"user_id"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// UserRole represents the users role
type UserRole string

const (
	RoleStudent UserRole = "student"
	RoleTeacher UserRole = "teacher"
	RoleAdmin   UserRole = "admin"
	RoleUnknown UserRole = "unknown"
)

// Custom validation functions
func isValidEmail(email string) bool {
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	return emailRegex.MatchString(email)
}

func isValidPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)

	return hasUpper && hasLower && hasDigit
}

func isValidPESEL(pesel string) bool {
	if len(pesel) != 11 {
		return false
	}

	// Check if all characters are digits
	for _, char := range pesel {
		if char < '0' || char > '9' {
			return false
		}
	}

	// PESEL checksum validation
	weights := []int{9, 7, 3, 1, 9, 7, 3, 1, 9, 7}
	sum := 0

	for i := 0; i < 10; i++ {
		digit := int(pesel[i] - '0')
		sum += digit * weights[i]
	}

	checksum := sum % 10
	expectedChecksum := int(pesel[10] - '0')

	return checksum == expectedChecksum
}

func isValidPhoneNumber(phone string) bool {
	// Polish phone number validation
	phoneRegex := regexp.MustCompile(`^(\+48)?[ -]?\d{3}[ -]?\d{3}[ -]?\d{3}$`)
	return phoneRegex.MatchString(phone)
}

func NewAuthServer(db *sql.DB) *AuthServer {
	return &AuthServer{
		db:     db,
		cache:  nil,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("auth-service"),
	}
}

func NewAuthServerWithCache(db *sql.DB, cacheClient cache.Cache) *AuthServer {
	return &AuthServer{
		db:     db,
		cache:  cacheClient,
		config: cache.DefaultCacheConfig(),
		logger: logger.NewLogger("auth-service"),
	}
}

func (s *AuthServer) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	// Basic validation
	if req.Email == "" || req.Password == "" {
		authLog.LogWarn("Login validation failed: empty email or password")
		return &pb.LoginResponse{
			Message:   "Email and password are required",
			ExpiresIn: 0,
		}, status.Error(codes.InvalidArgument, "Email and password are required")
	}

	var user *User
	if s.cache != nil {
		cacheKey := cache.GenerateKey("auth", "user_by_email", req.Email)
		var cachedUser User
		err := s.cache.Get(ctx, cacheKey, &cachedUser)
		if err == nil {
			authLog.LogInfo("User fetched from cache for login")
			user = &cachedUser
		}
	}

	if user == nil {
		var userID int
		var hashedPassword string
		err := s.db.QueryRow("SELECT user_id, password FROM users WHERE email = $1", req.Email).Scan(&userID, &hashedPassword)
		if err != nil {
			authLog.LogWarn(fmt.Sprintf("Login attempt for non-existent email: %s", req.Email))
			return &pb.LoginResponse{
				Message:   "Invalid credentials",
				ExpiresIn: 0,
			}, nil
		}

		user = &User{
			ID:       int64(userID),
			Email:    req.Email,
			Password: hashedPassword,
			Active:   true,
		}

		// Cache user profile
		if s.cache != nil {
			cacheKey := cache.GenerateKey("auth", "user_by_email", req.Email)
			s.cache.Set(ctx, cacheKey, user, 10*time.Minute)
		}
	}

	err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		authLog.LogWarn(fmt.Sprintf("Failed login attempt for email: %s", req.Email))
		return &pb.LoginResponse{
			Message:   "Invalid credentials",
			ExpiresIn: 0,
		}, nil
	}

	accessToken, refreshToken, err := auth.GenerateTokens(user.ID)
	if err != nil {
		authLog.LogError("Token generation failed", err)
		return &pb.LoginResponse{
			Message:   "Token generation failed",
			ExpiresIn: 0,
		}, nil
	}

	if s.cache != nil {
		session := &Session{
			Token:     accessToken,
			UserID:    user.ID,
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(s.config.SessionTTL),
		}

		sessionKey := cache.GenerateKey("auth", "session", accessToken)
		err = s.cache.Set(ctx, sessionKey, session, s.config.SessionTTL)
		if err != nil {
			authLog.LogWarn("Failed to cache session")
		}

		if refreshToken != "" {
			refreshKey := cache.GenerateKey("auth", "refresh", refreshToken)
			s.cache.Set(ctx, refreshKey, session, s.config.SessionTTL*7) // Longer TTL for refresh
		}
	}

	md := metadata.Pairs(
		"x-access-token", accessToken,
		"x-refresh-token", refreshToken,
		"x-expires-in", "3600",
	)
	grpc.SendHeader(ctx, md)

	authLog.LogInfo(fmt.Sprintf("User %d logged in successfully", user.ID))
	return &pb.LoginResponse{
		Message:   "Login successful",
		ExpiresIn: 3600,
	}, nil
}

func (s *AuthServer) Logout(ctx context.Context, req *pb.LogoutRequest) (*pb.LogoutResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return &pb.LogoutResponse{
			Success: false,
			Message: "No metadata found",
		}, nil
	}

	var accessToken, refreshToken string

	if tokens := md.Get("authorization"); len(tokens) > 0 {
		accessToken = tokens[0]
	}

	if rTokens := md.Get("refresh_token"); len(rTokens) > 0 {
		refreshToken = rTokens[0]
	}

	if s.cache != nil {
		if accessToken != "" {
			sessionKey := cache.GenerateKey("auth", "session", accessToken)
			s.cache.Delete(ctx, sessionKey)
		}

		if refreshToken != "" {
			refreshKey := cache.GenerateKey("auth", "refresh", refreshToken)
			s.cache.Delete(ctx, refreshKey)
		}

	}

	if refreshToken != "" {
		_, err := s.db.Exec(
			"INSERT INTO token_blacklist (token, blacklisted_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
			refreshToken, time.Now(),
		)
		if err != nil {
			log.Printf("Failed to blacklist refresh token: %v", err)
		}
	}

	if accessToken != "" {
		_, err := s.db.Exec(
			"INSERT INTO token_blacklist (token, blacklisted_at) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
			accessToken, time.Now(),
		)
		if err != nil {
			log.Printf("Failed to blacklist access token: %v", err)
		}
	}

	return &pb.LogoutResponse{
		Success: true,
		Message: "Successfully logged out",
	}, nil
}

func (s *AuthServer) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	authLog.LogInfo("Register request received")

	if req.Email == "" {
		authLog.LogWarn("Registration failed: email is required")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Email is required",
		}, nil
	}

	if req.Password == "" {
		authLog.LogWarn("Registration failed: password is required")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Password is required",
		}, nil
	}

	if req.Name == "" {
		authLog.LogWarn("Registration failed: name is required")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Name is required",
		}, nil
	}

	if req.Surname == "" {
		authLog.LogWarn("Registration failed: surname is required")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Surname is required",
		}, nil
	}

	if req.Role == "" {
		authLog.LogWarn("Registration failed: role is required")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Role is required",
		}, nil
	}

	validRoles := map[string]bool{
		"student": true,
		"teacher": true,
		"admin":   true,
	}

	if !validRoles[req.Role] {
		authLog.LogWarn("Registration failed: invalid role")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Invalid role. Allowed: student, teacher, admin",
		}, nil
	}

	if err := s.validateRoleSpecificFields(req); err != nil {
		authLog.LogWarn(fmt.Sprintf("Registration failed: %s", err.Error()))
		return &pb.RegisterResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	if !isValidEmail(req.Email) {
		authLog.LogWarn("Registration failed: invalid email format")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Invalid email format",
		}, nil
	}

	if !isValidPassword(req.Password) {
		authLog.LogWarn("Registration failed: password too weak")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Password must be at least 8 characters with uppercase, lowercase and digit",
		}, nil
	}

	if req.Pesel != "" && !isValidPESEL(req.Pesel) {
		authLog.LogWarn("Registration failed: invalid PESEL")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Invalid PESEL format",
		}, nil
	}

	if req.PhoneNr != "" && !isValidPhoneNumber(req.PhoneNr) {
		authLog.LogWarn("Registration failed: invalid phone number")
		return &pb.RegisterResponse{
			Success: false,
			Message: "Invalid phone number format",
		}, nil
	}

	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))

	cacheKey := fmt.Sprintf("user:email:%s", normalizedEmail)
	if s.cache != nil {
		var cachedUser User
		if err := s.cache.Get(ctx, cacheKey, &cachedUser); err == nil {
			authLog.LogWarn("Registration failed: user already exists (from cache)")
			return &pb.RegisterResponse{
				Success: false,
				Message: "User with this email already exists",
			}, nil
		}
	}

	var existingID int64
	checkQuery := "SELECT user_id FROM users WHERE email = $1"
	err := s.db.QueryRow(checkQuery, normalizedEmail).Scan(&existingID)
	if err != sql.ErrNoRows {
		if err != nil {
			authLog.LogError("Database error during email check", err)
			return &pb.RegisterResponse{
				Success: false,
				Message: "Database error during user check",
			}, status.Error(codes.Internal, "Database error")
		}
		authLog.LogWarn("Registration failed: user already exists")
		return &pb.RegisterResponse{
			Success: false,
			Message: "User with this email already exists",
		}, nil
	}

	if err := s.checkRoleSpecificUniqueness(req); err != nil {
		authLog.LogWarn(fmt.Sprintf("Registration failed: %s", err.Error()))
		return &pb.RegisterResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		authLog.LogError("Failed to hash password", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Password processing error",
		}, status.Error(codes.Internal, "Password hashing error")
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		authLog.LogError("Failed to begin transaction", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Database transaction error",
		}, status.Error(codes.Internal, "Transaction error")
	}
	defer tx.Rollback()

	currentTime := time.Now()

	insertUserQuery := `
        INSERT INTO users (
            email, password, name, surname, pesel, phone_nr,
            postal_address, registration_address, bank_account_nr,
            active, email_app_password
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING user_id`

	var userID int64
	var encryptedAppPass *string

	// Preferred: take email app password from request body (proto field)
	if strings.TrimSpace(req.GetEmailAppPassword()) != "" {
		key, keyErr := cryptoutil.ParseKey(configs.Envs.EmailAppSecretKey)
		if keyErr != nil {
			authLog.LogError("Invalid EMAIL_APP_SECRET_KEY", keyErr)
			return &pb.RegisterResponse{Success: false, Message: "Server encryption key misconfigured"}, status.Error(codes.Internal, "Encryption key misconfigured")
		}
		enc, encErr := cryptoutil.EncryptAESGCMBase64(strings.TrimSpace(req.GetEmailAppPassword()), key)
		if encErr != nil {
			authLog.LogError("Failed to encrypt email_app_password", encErr)
			return &pb.RegisterResponse{Success: false, Message: "Failed to process email app password"}, status.Error(codes.Internal, "Email app password encryption error")
		}
		encryptedAppPass = &enc
	} else if md, ok := metadata.FromIncomingContext(ctx); ok { // Fallback: custom header for backward compat
		vals := md.Get("email_app_password")
		if len(vals) > 0 && strings.TrimSpace(vals[0]) != "" {
			key, keyErr := cryptoutil.ParseKey(configs.Envs.EmailAppSecretKey)
			if keyErr != nil {
				authLog.LogError("Invalid EMAIL_APP_SECRET_KEY", keyErr)
				return &pb.RegisterResponse{Success: false, Message: "Server encryption key misconfigured"}, status.Error(codes.Internal, "Encryption key misconfigured")
			}
			enc, encErr := cryptoutil.EncryptAESGCMBase64(strings.TrimSpace(vals[0]), key)
			if encErr != nil {
				authLog.LogError("Failed to encrypt email_app_password", encErr)
				return &pb.RegisterResponse{Success: false, Message: "Failed to process email app password"}, status.Error(codes.Internal, "Email app password encryption error")
			}
			encryptedAppPass = &enc
		}
	}

	err = tx.QueryRow(
		insertUserQuery,
		normalizedEmail,
		string(hashedPassword),
		strings.TrimSpace(req.Name),
		strings.TrimSpace(req.Surname),
		strings.TrimSpace(req.Pesel),
		strings.TrimSpace(req.PhoneNr),
		strings.TrimSpace(req.PostalAddress),
		strings.TrimSpace(req.RegistrationAddress),
		strings.TrimSpace(req.BankAccountNr),
		true,
		encryptedAppPass,
	).Scan(&userID)

	if err != nil {
		authLog.LogError("Failed to insert user", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to create user account",
		}, status.Error(codes.Internal, "User creation error")
	}

	roleID, err := s.insertIntoRoleTable(tx, userID, req)
	if err != nil {
		authLog.LogError("Failed to insert into role table", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: fmt.Sprintf("Role assignment error: %s", err.Error()),
		}, status.Error(codes.Internal, "Role assignment error")
	}

	if err = tx.Commit(); err != nil {
		authLog.LogError("Failed to commit transaction", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Transaction commit error",
		}, status.Error(codes.Internal, "Transaction commit error")
	}

	userData := &pb.UserData{
		UserId:              userID,
		Name:                req.Name,
		Surname:             req.Surname,
		Email:               normalizedEmail,
		Pesel:               req.Pesel,
		PhoneNr:             req.PhoneNr,
		PostalAddress:       req.PostalAddress,
		RegistrationAddress: req.RegistrationAddress,
		BankAccountNr:       req.BankAccountNr,
		Active:              true,
		ActivationDate:      currentTime.Format("2006-01-02 15:04:05"),
		Role:                req.Role,
	}

	if s.cache != nil {
		userCacheData := User{
			ID:       userID,
			Email:    normalizedEmail,
			Password: string(hashedPassword),
			Active:   true,
		}

		cacheExpiry := 24 * time.Hour
		if err := s.cache.Set(ctx, cacheKey, userCacheData, cacheExpiry); err != nil {
			authLog.LogWarn("Failed to cache user data")
		}

		userDataCacheKey := fmt.Sprintf("userdata:%d", userID)
		if err := s.cache.Set(ctx, userDataCacheKey, userData, cacheExpiry); err != nil {
			authLog.LogWarn("Failed to cache user data")
		}

		roleCacheKey := fmt.Sprintf("role:%d", userID)
		roleData := map[string]interface{}{
			"role":    req.Role,
			"role_id": roleID,
		}
		if err := s.cache.Set(ctx, roleCacheKey, roleData, cacheExpiry); err != nil {
			authLog.LogWarn("Failed to cache role data")
		}
	}

	authLog.LogInfo(fmt.Sprintf("User registered successfully with ID: %d, Role: %s, RoleID: %d", userID, req.Role, roleID))

	return &pb.RegisterResponse{
		Success:  true,
		Message:  fmt.Sprintf("Account created successfully as %s", req.Role),
		UserId:   userID,
		UserData: userData,
	}, nil
}

func (s *AuthServer) validateRoleSpecificFields(req *pb.RegisterRequest) error {
	switch req.Role {
	case "student":
		return nil

	case "teacher":
		if req.Degree == "" {
			return fmt.Errorf("degree is required for teachers")
		}
		if req.Title == "" {
			return fmt.Errorf("title is required for teachers")
		}
		if req.FacultyId == 0 {
			return fmt.Errorf("faculty is required for teachers")
		}

	case "admin":
		if req.AdminRole == "" {
			return fmt.Errorf("admin role is required for administrators")
		}
		if req.FacultyId == 0 {
			return fmt.Errorf("faculty is required for administrators")
		}
	}

	return nil
}
func (s *AuthServer) checkRoleSpecificUniqueness(req *pb.RegisterRequest) error {
	switch req.Role {
	case "student":
		return nil

	case "teacher":
		if req.FacultyId > 0 {
			var facultyExists bool
			err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM faculties WHERE faculty_id = $1)", req.FacultyId).Scan(&facultyExists)
			if err != nil {
				return fmt.Errorf("error checking faculty")
			}
			if !facultyExists {
				return fmt.Errorf("specified faculty does not exist")
			}
		}

	case "admin":
		if req.FacultyId > 0 {
			var facultyExists bool
			err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM faculties WHERE faculty_id = $1)", req.FacultyId).Scan(&facultyExists)
			if err != nil {
				return fmt.Errorf("error checking faculty")
			}
			if !facultyExists {
				return fmt.Errorf("specified faculty does not exist")
			}
		}
	}

	return nil
}
func (s *AuthServer) insertIntoRoleTable(tx *sql.Tx, userID int64, req *pb.RegisterRequest) (int64, error) {
	var roleID int64

	switch req.Role {
	case "student":
		query := `INSERT INTO students (user_id) VALUES ($1) RETURNING album_nr`

		err := tx.QueryRow(query, userID).Scan(&roleID)
		if err != nil {
			return 0, fmt.Errorf("failed to insert student: %w", err)
		}

		authLog.LogInfo(fmt.Sprintf("Student created with album_nr: %d", roleID))

	case "teacher":
		query := `
			INSERT INTO teaching_staff (degree, title, faculty_id, user_id)
			VALUES ($1, $2, $3, $4)
			RETURNING teaching_staff_id`

		err := tx.QueryRow(
			query,
			strings.TrimSpace(req.Degree),
			strings.TrimSpace(req.Title),
			req.FacultyId,
			userID,
		).Scan(&roleID)

		if err != nil {
			return 0, fmt.Errorf("failed to insert teaching staff: %w", err)
		}

		authLog.LogInfo(fmt.Sprintf("Teacher created with teaching_staff_id: %d", roleID))

	case "admin":
		query := `
			INSERT INTO administrative_staff (role, faculty_id, user_id)
			VALUES ($1, $2, $3)
			RETURNING administrative_staff_id`

		err := tx.QueryRow(
			query,
			strings.TrimSpace(req.AdminRole),
			req.FacultyId,
			userID,
		).Scan(&roleID)

		if err != nil {
			return 0, fmt.Errorf("failed to insert administrative staff: %w", err)
		}

		authLog.LogInfo(fmt.Sprintf("Administrator created with administrative_staff_id: %d", roleID))

	default:
		return 0, fmt.Errorf("unknown role: %s", req.Role)
	}

	return roleID, nil
}
func (s *AuthServer) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	var session *Session
	if s.cache != nil {
		refreshKey := cache.GenerateKey("auth", "refresh", req.RefreshToken)
		var cachedSession Session
		err := s.cache.Get(ctx, refreshKey, &cachedSession)
		if err == nil {
			session = &cachedSession
		}
	}

	if session == nil {
		claims, err := auth.ValidateToken(req.RefreshToken)
		if err != nil {
			return &pb.RefreshTokenResponse{
				Message:   "Invalid refresh token",
				ExpiresIn: 0,
			}, nil
		}

		var isBlacklisted bool
		err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM token_blacklist WHERE token = $1)", req.RefreshToken).Scan(&isBlacklisted)
		if err != nil {
			log.Printf("Blacklist check error: %v", err)
		} else if isBlacklisted {
			return &pb.RefreshTokenResponse{
				Message:   "Token has been invalidated",
				ExpiresIn: 0,
			}, nil
		}

		session = &Session{
			UserID:    claims.UserID,
			ExpiresAt: time.Now().Add(time.Hour),
		}
	}

	if time.Now().After(session.ExpiresAt) {
		return &pb.RefreshTokenResponse{
			Message:   "Refresh token expired",
			ExpiresIn: 0,
		}, nil
	}

	newAccessToken, _, err := auth.GenerateTokens(session.UserID)
	if err != nil {
		return &pb.RefreshTokenResponse{
			Message:   "Token generation failed",
			ExpiresIn: 0,
		}, nil
	}

	if s.cache != nil {
		newSession := &Session{
			Token:     newAccessToken,
			UserID:    session.UserID,
			CreatedAt: time.Now(),
			ExpiresAt: time.Now().Add(s.config.SessionTTL),
		}

		sessionKey := cache.GenerateKey("auth", "session", newAccessToken)
		s.cache.Set(ctx, sessionKey, newSession, s.config.SessionTTL)
	}

	md := metadata.Pairs(
		"x-access-token", newAccessToken,
		"x-expires-in", "3600",
	)
	grpc.SendHeader(ctx, md)

	return &pb.RefreshTokenResponse{
		Message:   "Token refreshed successfully",
		ExpiresIn: 3600,
	}, nil
}

func (s *AuthServer) ForgotPassword(ctx context.Context, req *pb.ForgotPasswordRequest) (*pb.ForgotPasswordResponse, error) {
	// Basic validation
	if req.Email == "" || !isValidEmail(req.Email) {
		authLog.LogWarn("Forgot password validation failed: invalid email")
		return &pb.ForgotPasswordResponse{
			Success: false,
			Message: "Invalid email format",
		}, status.Error(codes.InvalidArgument, "Invalid email format")
	}

	// Check if user exists
	var userID int
	var email string
	err := s.db.QueryRow("SELECT user_id, email FROM users WHERE email = $1", req.Email).Scan(&userID, &email)
	if err != nil {
		// Return success even if user doesn't exist for security
		authLog.LogInfo(fmt.Sprintf("Password reset requested for non-existent email: %s", req.Email))
		return &pb.ForgotPasswordResponse{
			Success: true,
			Message: "If email exists, reset instructions have been sent",
		}, nil
	}

	// Generate reset token
	resetToken := generateResetToken()
	expiresAt := time.Now().Add(1 * time.Hour) // 1 hour expiry

	// Store reset token w cache & DB
	if s.cache != nil {
		resetKey := cache.GenerateKey("auth", "reset_token", resetToken)
		resetData := map[string]interface{}{
			"user_id":    userID,
			"email":      email,
			"expires_at": expiresAt,
		}
		s.cache.Set(ctx, resetKey, resetData, time.Hour)
	}

	_, err = s.db.Exec(
		"INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
		userID, resetToken, expiresAt,
	)
	if err != nil {
		authLog.LogError("Failed to store reset token", err)
		return &pb.ForgotPasswordResponse{
			Success: false,
			Message: "Failed to process password reset",
		}, nil
	}

	// Send email via messaging service
	emailSent := sendPasswordResetEmail(email, resetToken)
	if !emailSent {
		authLog.LogWarn(fmt.Sprintf("Failed to send password reset email to: %s", email))
	} else {
		authLog.LogInfo(fmt.Sprintf("Password reset email sent successfully to: %s", email))
	}

	return &pb.ForgotPasswordResponse{
		Success: true,
		Message: "If email exists, reset instructions have been sent",
	}, nil
}

func (s *AuthServer) ResetPassword(ctx context.Context, req *pb.ResetPasswordRequest) (*pb.ResetPasswordResponse, error) {
	// Validate input data
	if req.Token == "" || req.NewPassword == "" {
		authLog.LogWarn("Reset password validation failed: missing token or password")
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Token and new password are required",
		}, status.Error(codes.InvalidArgument, "Token and new password are required")
	}

	if !isValidPassword(req.NewPassword) {
		authLog.LogWarn("Reset password validation failed: weak password")
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Password must be at least 8 characters with uppercase, lowercase and digit",
		}, status.Error(codes.InvalidArgument, "Weak password")
	}

	var userID int
	var expiresAt time.Time
	var used bool

	if s.cache != nil {
		resetKey := cache.GenerateKey("auth", "reset_token", req.Token)
		var resetData map[string]interface{}
		err := s.cache.Get(ctx, resetKey, &resetData)
		if err == nil {
			if userIDFloat, ok := resetData["user_id"].(float64); ok {
				userID = int(userIDFloat)
			}
			if expiresAtStr, ok := resetData["expires_at"].(string); ok {
				expiresAt, _ = time.Parse(time.RFC3339, expiresAtStr)
			}
			used = false
		}
	}

	if userID == 0 {
		err := s.db.QueryRow(
			"SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1",
			req.Token,
		).Scan(&userID, &expiresAt, &used)

		if err != nil {
			authLog.LogWarn(fmt.Sprintf("Invalid reset token attempted: %s", req.Token))
			return &pb.ResetPasswordResponse{
				Success: false,
				Message: "Invalid or expired reset token",
			}, nil
		}
	}

	if time.Now().After(expiresAt) || used {
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Reset token has expired or already been used",
		}, nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		authLog.LogError("Failed to hash new password", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to process password reset",
		}, nil
	}

	_, err = s.db.Exec("UPDATE users SET password = $1 WHERE user_id = $2", hashedPassword, userID)
	if err != nil {
		authLog.LogError("Failed to update password", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to update password",
		}, nil
	}

	_, err = s.db.Exec("UPDATE password_reset_tokens SET used = true WHERE token = $1", req.Token)
	if err != nil {
		authLog.LogWarn("Failed to mark reset token as used")
	}

	if s.cache != nil {
		resetKey := cache.GenerateKey("auth", "reset_token", req.Token)
		s.cache.Delete(ctx, resetKey)

		s.invalidateUserCache(ctx, int64(userID))
	}

	authLog.LogInfo(fmt.Sprintf("Password reset successful for user ID: %d", userID))
	return &pb.ResetPasswordResponse{
		Success: true,
		Message: "Password reset successful",
	}, nil
}

func (s *AuthServer) GetUserName(ctx context.Context, req *pb.GetUserNameRequest) (*pb.GetUserNameResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		authLog.LogWarn("GetUserName: Brak metadanych")
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Brak metadanych",
			Success:  false,
			Status:   401,
		}, nil
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		authLog.LogWarn("GetUserName: Brak tokenu w authorization")
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Brak tokenu autoryzacji",
			Success:  false,
			Status:   401,
		}, nil
	}

	accessToken := tokens[0]

	claims, err := auth.ValidateToken(accessToken)
	if err != nil {
		authLog.LogWarn(fmt.Sprintf("Invalid token in GetUserName: %v", err))
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Nieprawidłowy token",
			Success:  false,
			Status:   401,
		}, nil
	}

	var name string
	err = s.db.QueryRow("SELECT name FROM users WHERE user_id = $1", claims.UserID).Scan(&name)
	if err != nil {
		if err == sql.ErrNoRows {
			authLog.LogWarn(fmt.Sprintf("User not found: %d", claims.UserID))
			return &pb.GetUserNameResponse{
				Username: "",
				Message:  "User not found",
				Success:  false,
				Status:   404,
			}, nil
		}

		authLog.LogError("Failed to fetch user name", err)
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Server error while getting the users name",
			Success:  false,
			Status:   500,
		}, nil
	}

	authLog.LogInfo(fmt.Sprintf("Username retrieved successfully for user ID: %d", claims.UserID))
	return &pb.GetUserNameResponse{
		Username: name,
		Message:  "Success",
		Success:  true,
		Status:   200,
	}, nil
}

func (s *AuthServer) GetUserData(ctx context.Context, req *pb.GetUserDataRequest) (*pb.GetUserDataResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		authLog.LogWarn("GetUserData: No metadata found")
		return &pb.GetUserDataResponse{
			User:    nil,
			Success: false,
			Message: "No metadata",
			Status:  401,
		}, nil
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		authLog.LogWarn("GetUserData: No authorization token")
		return &pb.GetUserDataResponse{
			User:    nil,
			Success: false,
			Message: "No authorization token",
			Status:  401,
		}, nil
	}

	claims, err := auth.ValidateToken(tokens[0])
	if err != nil {
		authLog.LogWarn(fmt.Sprintf("GetUserData: Invalid token: %v", err))
		return &pb.GetUserDataResponse{
			User:    nil,
			Success: false,
			Message: "Invalid token",
			Status:  401,
		}, nil
	}

	// Get user data from database
	query := `
		SELECT u.user_id, u.name, u.surname, u.email, u.active,
		       CASE
		           WHEN s.user_id IS NOT NULL THEN 'student'
		           WHEN ts.user_id IS NOT NULL THEN 'teacher'
		           WHEN admin_staff.user_id IS NOT NULL THEN 'admin'
		           ELSE 'unknown'
		       END as role
		FROM users u
		LEFT JOIN students s ON u.user_id = s.user_id
		LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
		LEFT JOIN administrative_staff admin_staff ON u.user_id = admin_staff.user_id
		WHERE u.user_id = $1
	`
	var user pb.User
	err = s.db.QueryRow(query, claims.UserID).Scan(
		&user.UserId, &user.Name, &user.Surname,
		&user.Email, &user.Active, &user.Role,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			authLog.LogWarn(fmt.Sprintf("User not found: %d", claims.UserID))
			return &pb.GetUserDataResponse{
				User:    nil,
				Success: false,
				Message: "User not found",
				Status:  404,
			}, nil
		}

		authLog.LogError("Failed to fetch user data", err)
		return &pb.GetUserDataResponse{
			User:    nil,
			Success: false,
			Message: "Error fetching user data",
			Status:  500,
		}, nil
	}

	authLog.LogInfo(fmt.Sprintf("User data retrieved successfully for user ID: %d", claims.UserID))
	return &pb.GetUserDataResponse{
		User:    &user,
		Success: true,
		Message: "User data retrieved successfully",
		Status:  200,
	}, nil
}

func (s *AuthServer) GetUserRole(ctx context.Context, req *pb.GetUserRoleRequest) (*pb.GetUserRoleResponse, error) {
	var userID int64

	if req.UserId == 0 {
		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return &pb.GetUserRoleResponse{
				Role:    "",
				Success: false,
				Message: "No metadata",
				Status:  401,
			}, nil
		}

		tokens := md.Get("authorization")
		if len(tokens) == 0 {
			return &pb.GetUserRoleResponse{
				Role:    "",
				Success: false,
				Message: "No authorization token",
				Status:  401,
			}, nil
		}

		claims, err := auth.ValidateToken(tokens[0])
		if err != nil {
			return &pb.GetUserRoleResponse{
				Role:    "",
				Success: false,
				Message: "Invalid token",
				Status:  401,
			}, nil
		}
		userID = claims.UserID
	} else {
		userID = req.UserId
	}

	role, err := s.getUserRoleFromDB(ctx, userID)
	if err != nil {
		return &pb.GetUserRoleResponse{
			Role:    "",
			Success: false,
			Message: "Error while getting user role",
			Status:  500,
		}, nil
	}

	return &pb.GetUserRoleResponse{
		Role:    string(role),
		Success: true,
		Message: "Role retrieved successfully",
		Status:  200,
	}, nil
}

// getUserRoleFromDB sprawdza rolę użytkownika w bazie danych
func (s *AuthServer) getUserRoleFromDB(ctx context.Context, userID int64) (UserRole, error) {
	// Sprawdzenie w cache najpierw
	if s.cache != nil {
		roleCacheKey := fmt.Sprintf("role:%d", userID)
		var roleData map[string]interface{}
		if err := s.cache.Get(ctx, roleCacheKey, &roleData); err == nil {
			if role, ok := roleData["role"].(string); ok {
				return UserRole(role), nil
			}
		}
	}

	var exists bool

	// Sprawdzenie w tabeli students
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM students WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return RoleUnknown, err
	}
	if exists {
		return RoleStudent, nil
	}

	// Sprawdzenie w tabeli teaching_staff
	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM teaching_staff WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return RoleUnknown, err
	}
	if exists {
		return RoleTeacher, nil
	}

	// Sprawdzenie w tabeli administrative_staff
	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM administrative_staff WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return RoleUnknown, err
	}
	if exists {
		return RoleAdmin, nil
	}

	return RoleUnknown, nil
}

func (s *AuthServer) GetUsers(ctx context.Context, req *pb.GetUsersRequest) (*pb.GetUsersResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		authLog.LogWarn("GetUsers: Brak metadanych")
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "No metadata",
			Status:  401,
		}, nil
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		authLog.LogWarn("GetUsers: Brak tokenu autoryzacji")
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "No authorization token",
			Status:  401,
		}, nil
	}

	claims, err := auth.ValidateToken(tokens[0])
	if err != nil {
		authLog.LogWarn(fmt.Sprintf("GetUsers: Invalid token: %v", err))
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "Invalid token",
			Status:  401,
		}, nil
	}

	userRole, err := s.getUserRoleFromDB(ctx, claims.UserID)
	if err != nil {
		authLog.LogError("GetUsers: Error checking user role", err)
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "Error while checking credentials",
			Status:  500,
		}, nil
	}

	if userRole != RoleAdmin {
		authLog.LogWarn(fmt.Sprintf("GetUsers: Access denied for user %d with role %s", claims.UserID, userRole))
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "Only administrators can access this data",
			Status:  403,
		}, nil
	}

	authLog.LogInfo(fmt.Sprintf("GetUsers: Admin user %d requesting users list", claims.UserID))

	query := `
        SELECT u.user_id, u.name, u.surname, u.email, u.active,
               CASE
                   WHEN s.user_id IS NOT NULL THEN 'student'
                   WHEN ts.user_id IS NOT NULL THEN 'teacher'
                   WHEN admin_staff.user_id IS NOT NULL THEN 'admin'
                   ELSE 'unknown'
               END as role
        FROM users u
        LEFT JOIN students s ON u.user_id = s.user_id
        LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
        LEFT JOIN administrative_staff admin_staff ON u.user_id = admin_staff.user_id
        ORDER BY u.user_id
    `

	rows, err := s.db.Query(query)
	if err != nil {
		authLog.LogError("GetUsers SQL error", err)
		return &pb.GetUsersResponse{
			Users:   nil,
			Success: false,
			Message: "Error fetching users",
			Status:  500,
		}, nil
	}
	defer rows.Close()

	var users []*pb.User
	for rows.Next() {
		user := &pb.User{}
		err := rows.Scan(&user.UserId, &user.Name, &user.Surname, &user.Email, &user.Active, &user.Role)
		if err != nil {
			authLog.LogWarn(fmt.Sprintf("Error scanning user row: %v", err))
			continue
		}
		users = append(users, user)
	}

	authLog.LogInfo(fmt.Sprintf("GetUsers: Successfully returned %d users to admin user %d", len(users), claims.UserID))

	return &pb.GetUsersResponse{
		Users:   users,
		Success: true,
		Message: "Users retrieved successfully",
		Status:  200,
	}, nil
}

// SayHello implementuje AuthHello service
func (s *AuthServer) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloResponse, error) {
	return &pb.HelloResponse{
		Message: "Hello from Auth Service!",
	}, nil
}

func (s *AuthServer) getUserRoleDetails(ctx context.Context, userID int64) (map[string]interface{}, error) {
	role, err := s.getUserRoleFromDB(ctx, userID)
	if err != nil {
		return nil, err
	}

	details := make(map[string]interface{})
	details["role"] = string(role)

	switch role {
	case RoleStudent:
		var albumNr int
		err := s.db.QueryRow("SELECT album_nr FROM students WHERE user_id = $1", userID).Scan(&albumNr)
		if err != nil {
			return nil, err
		}
		details["album_nr"] = albumNr

	case RoleTeacher:
		var teachingStaffId int
		var degree, title string
		var facultyId int
		query := "SELECT teaching_staff_id, degree, title, faculty_id FROM teaching_staff WHERE user_id = $1"
		err := s.db.QueryRow(query, userID).Scan(&teachingStaffId, &degree, &title, &facultyId)
		if err != nil {
			return nil, err
		}
		details["teaching_staff_id"] = teachingStaffId
		details["degree"] = degree
		details["title"] = title
		details["faculty_id"] = facultyId

	case RoleAdmin:
		var adminStaffId int
		var adminRole string
		var facultyId int
		query := "SELECT administrative_staff_id, role, faculty_id FROM administrative_staff WHERE user_id = $1"
		err := s.db.QueryRow(query, userID).Scan(&adminStaffId, &adminRole, &facultyId)
		if err != nil {
			return nil, err
		}
		details["administrative_staff_id"] = adminStaffId
		details["admin_role"] = adminRole
		details["faculty_id"] = facultyId
	}

	return details, nil
}

func (s *AuthServer) GetUserEditData(ctx context.Context, req *pb.GetUserEditDataRequest) (*pb.GetUserEditDataResponse, error) {
	authLog.LogInfo(fmt.Sprintf("GetUserEditData request received for user_id: %d", req.UserId))

	if req.UserId <= 0 {
		authLog.LogWarn("Invalid user_id provided")
		return nil, status.Error(codes.InvalidArgument, "invalid user_id")
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		loggedUserIDValues := md.Get("user_id")
		if len(loggedUserIDValues) > 0 {
			var loggedUserID int64
			fmt.Sscanf(loggedUserIDValues[0], "%d", &loggedUserID)

			authLog.LogDebug(fmt.Sprintf("Request by user_id: %d to edit user_id: %d", loggedUserID, req.UserId))
		}
	}

	if s.cache != nil {
		cacheKey := cache.GenerateKey("auth", "edit_data", req.UserId)
		var cachedResponse pb.GetUserEditDataResponse
		err := s.cache.Get(ctx, cacheKey, &cachedResponse)
		if err == nil {
			authLog.LogInfo("Edit data fetched from cache")
			return &cachedResponse, nil
		}
	}

	query := `
		SELECT
			user_id,
			name,
			COALESCE(surname, '') as surname,
			COALESCE(email, '') as email,
			COALESCE(phone_nr, '') as phone_nr,
			COALESCE(registration_address, '') as registration_address,
			COALESCE(postal_address, '') as postal_address,
			COALESCE(bank_account_nr, '') as bank_account_nr,
			active
		FROM users
		WHERE user_id = $1
	`

	var response pb.GetUserEditDataResponse
	err := s.db.QueryRow(query, req.UserId).Scan(
		&response.UserId,
		&response.Name,
		&response.Surname,
		&response.Email,
		&response.PhoneNr,
		&response.RegistrationAddress,
		&response.PostalAddress,
		&response.BankAccountNr,
		&response.Active,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			authLog.LogWarn(fmt.Sprintf("User not found: %d", req.UserId))
			return nil, status.Error(codes.NotFound, "user not found")
		}
		authLog.LogError("Failed to fetch user edit data", err)
		return nil, status.Error(codes.Internal, "failed to fetch user data")
	}

	if s.cache != nil {
		cacheKey := cache.GenerateKey("auth", "edit_data", req.UserId)
		s.cache.Set(ctx, cacheKey, &response, 5*time.Minute)
	}

	authLog.LogInfo(fmt.Sprintf("Successfully fetched edit data for user_id: %d", req.UserId))
	return &response, nil
}

func (s *AuthServer) UpdateUserData(ctx context.Context, req *pb.UpdateUserDataRequest) (*pb.UpdateUserDataResponse, error) {
	authLog.LogInfo(fmt.Sprintf("UpdateUserData request received for user_id: %d", req.UserId))

	if req.UserId <= 0 {
		authLog.LogWarn("Invalid user_id provided")
		return &pb.UpdateUserDataResponse{
			Success: false,
			Message: "Invalid user_id",
		}, nil
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if ok {
		loggedUserIDValues := md.Get("user_id")
		if len(loggedUserIDValues) > 0 {
			var loggedUserID int64
			fmt.Sscanf(loggedUserIDValues[0], "%d", &loggedUserID)

			authLog.LogDebug(fmt.Sprintf("User %d attempting to update user %d", loggedUserID, req.UserId))
		}
	}

	updates := []string{}
	args := []interface{}{req.UserId}
	argCount := 2

	addUpdate := func(fieldName string, value interface{}) {
		updates = append(updates, fmt.Sprintf("%s = $%d", fieldName, argCount))
		args = append(args, value)
		argCount++
	}

	if req.Name != nil {
		addUpdate("name", *req.Name)
	}
	if req.Surname != nil {
		addUpdate("surname", *req.Surname)
	}
	if req.Email != nil {
		email := strings.ToLower(strings.TrimSpace(*req.Email))
		if !strings.Contains(email, "@") {
			return &pb.UpdateUserDataResponse{
				Success: false,
				Message: "Invalid email format",
			}, nil
		}
		addUpdate("email", email)
	}
	if req.PhoneNr != nil {
		addUpdate("phone_nr", *req.PhoneNr)
	}
	if req.RegistrationAddress != nil {
		addUpdate("registration_address", *req.RegistrationAddress)
	}
	if req.PostalAddress != nil {
		addUpdate("postal_address", *req.PostalAddress)
	}
	if req.BankAccountNr != nil {
		bankAccount := strings.ReplaceAll(*req.BankAccountNr, " ", "")
		if len(bankAccount) > 0 && len(bankAccount) != 26 {
			return &pb.UpdateUserDataResponse{
				Success: false,
				Message: "Bank account number must be 26 digits",
			}, nil
		}
		addUpdate("bank_account_nr", *req.BankAccountNr)
	}
	if req.Active != nil {
		addUpdate("active", *req.Active)
		if !*req.Active {
			addUpdate("deactivation_date", time.Now())
		}
	}
	if req.Password != nil {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			authLog.LogError("Failed to hash password", err)
			return &pb.UpdateUserDataResponse{
				Success: false,
				Message: "Password processing error",
			}, nil
		}
		addUpdate("password", string(hashedPassword))
	}

	if len(updates) == 0 {
		authLog.LogWarn("No fields to update")
		return &pb.UpdateUserDataResponse{
			Success: false,
			Message: "No fields to update",
		}, nil
	}

	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE user_id = $1
		RETURNING
			user_id,
			name,
			COALESCE(surname, '') as surname,
			COALESCE(email, '') as email,
			COALESCE(phone_nr, '') as phone_nr,
			COALESCE(registration_address, '') as registration_address,
			COALESCE(postal_address, '') as postal_address,
			COALESCE(bank_account_nr, '') as bank_account_nr,
			active
	`, strings.Join(updates, ", "))

	authLog.LogDebug(fmt.Sprintf("Executing update query with %d fields", len(updates)))

	var updatedData pb.GetUserEditDataResponse
	err := s.db.QueryRow(query, args...).Scan(
		&updatedData.UserId,
		&updatedData.Name,
		&updatedData.Surname,
		&updatedData.Email,
		&updatedData.PhoneNr,
		&updatedData.RegistrationAddress,
		&updatedData.PostalAddress,
		&updatedData.BankAccountNr,
		&updatedData.Active,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			authLog.LogWarn(fmt.Sprintf("User not found: %d", req.UserId))
			return &pb.UpdateUserDataResponse{
				Success: false,
				Message: "User not found",
			}, nil
		}

		if strings.Contains(err.Error(), "duplicate") || strings.Contains(err.Error(), "unique") {
			authLog.LogWarn("Duplicate entry error during update")
			return &pb.UpdateUserDataResponse{
				Success: false,
				Message: "Email already exists",
			}, nil
		}

		authLog.LogError("Failed to update user data", err)
		return &pb.UpdateUserDataResponse{
			Success: false,
			Message: "Failed to update user data",
		}, nil
	}

	if s.cache != nil {
		cacheKey := cache.GenerateKey("auth", "edit_data", req.UserId)
		s.cache.Delete(ctx, cacheKey)

		if req.Email != nil {
			emailKey := cache.GenerateKey("auth", "user_by_email", *req.Email)
			s.cache.Delete(ctx, emailKey)
		}
	}

	authLog.LogInfo(fmt.Sprintf("Successfully updated user_id: %d", req.UserId))

	return &pb.UpdateUserDataResponse{
		Success:     true,
		Message:     "User data updated successfully",
		UpdatedData: &updatedData,
	}, nil
}

func (s *AuthServer) SearchUsers(ctx context.Context, req *pb.SearchUsersRequest) (*pb.SearchUsersResponse, error) {
	authLog.LogInfo("SearchUsers request received")

	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	conditions := []string{}
	args := []interface{}{}
	argCount := 1

	addCondition := func(column string, value string, operator string) {
		if operator == "ILIKE" {
			conditions = append(conditions, fmt.Sprintf("%s ILIKE $%d", column, argCount))
			args = append(args, "%"+value+"%")
		} else {
			conditions = append(conditions, fmt.Sprintf("%s %s $%d", column, operator, argCount))
			args = append(args, value)
		}
		argCount++
	}

	if req.Name != nil && *req.Name != "" {
		addCondition("u.name", *req.Name, "ILIKE")
	}
	if req.Surname != nil && *req.Surname != "" {
		addCondition("u.surname", *req.Surname, "ILIKE")
	}
	if req.Email != nil && *req.Email != "" {
		addCondition("u.email", *req.Email, "ILIKE")
	}
	if req.Pesel != nil && *req.Pesel != "" {
		addCondition("u.pesel", *req.Pesel, "=")
	}
	if req.PhoneNr != nil && *req.PhoneNr != "" {
		addCondition("u.phone_nr", *req.PhoneNr, "ILIKE")
	}
	if req.Active != nil {
		conditions = append(conditions, fmt.Sprintf("u.active = $%d", argCount))
		args = append(args, *req.Active)
		argCount++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM users u
		%s
	`, whereClause)

	var totalCount int
	err := s.db.QueryRow(countQuery, args...).Scan(&totalCount)
	if err != nil {
		authLog.LogError("Failed to count users", err)
		return nil, status.Error(codes.Internal, "failed to count users")
	}

	totalPages := int(math.Ceil(float64(totalCount) / float64(pageSize)))

	offset := (page - 1) * pageSize

	limitArg := argCount
	offsetArg := argCount + 1

	searchQuery := fmt.Sprintf(`
		SELECT
			u.user_id,
			u.name,
			COALESCE(u.surname, '') as surname,
			COALESCE(u.email, '') as email,
			COALESCE(u.pesel, '') as pesel,
			COALESCE(u.phone_nr, '') as phone_nr,
			u.active,
			COALESCE(
				CASE
					WHEN s.album_nr IS NOT NULL THEN 'student'
					WHEN ts.teaching_staff_id IS NOT NULL THEN 'teacher'
					WHEN adm.administrative_staff_id IS NOT NULL THEN 'admin'
					ELSE 'unknown'
				END, 'unknown'
			) as role
		FROM users u
		LEFT JOIN students s ON u.user_id = s.user_id
		LEFT JOIN teaching_staff ts ON u.user_id = ts.user_id
		LEFT JOIN administrative_staff adm ON u.user_id = adm.user_id
		%s
		ORDER BY u.user_id
		LIMIT $%d OFFSET $%d
	`, whereClause, limitArg, offsetArg)

	args = append(args, pageSize, offset)

	rows, err := s.db.Query(searchQuery, args...)
	if err != nil {
		authLog.LogError("Failed to search users", err)
		return nil, status.Error(codes.Internal, "failed to search users")
	}
	defer rows.Close()

	var users []*pb.UserSearchResult
	for rows.Next() {
		var user pb.UserSearchResult
		err := rows.Scan(
			&user.UserId,
			&user.Name,
			&user.Surname,
			&user.Email,
			&user.Pesel,
			&user.PhoneNr,
			&user.Active,
			&user.Role,
		)
		if err != nil {
			authLog.LogError("Failed to scan user row", err)
			continue
		}
		users = append(users, &user)
	}

	if err = rows.Err(); err != nil {
		authLog.LogError("Error during rows iteration", err)
		return nil, status.Error(codes.Internal, "error processing search results")
	}

	authLog.LogInfo(fmt.Sprintf("Found %d users (total: %d)", len(users), totalCount))

	return &pb.SearchUsersResponse{
		Users:      users,
		TotalCount: int32(totalCount),
		Page:       page,
		PageSize:   pageSize,
		TotalPages: int32(totalPages),
	}, nil
}

// Helper functions
func generateResetToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}

func sendPasswordResetEmail(email, token string) bool {
	conn, err := grpc.NewClient("messaging:3002", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Printf("Failed to connect to messaging service: %v", err)
		return false
	}
	defer conn.Close()

	client := messagingpb.NewMessagingServiceClient(conn)

	resetLink := fmt.Sprintf("%s/reset-password?token=%s", configs.Envs.PublicHost, token)
	body := fmt.Sprintf("Click here to reset your password: %s", resetLink)

	_, err = client.SendEmail(context.Background(), &messagingpb.SendEmailRequest{
		To:      email,
		From:    "noreply@usosweb.com",
		Subject: "Password Reset Request",
		Body:    body,
	})

	return err == nil
}

func (s *AuthServer) invalidateUserCache(ctx context.Context, userID int64) {
	if s.cache == nil {
		return
	}

	keys := []string{
		cache.GenerateKey("auth", "user_by_id", userID),
	}

	for _, key := range keys {
		s.cache.Delete(ctx, key)
	}
}
