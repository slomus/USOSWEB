package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	messagingpb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/cache"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"github.com/slomus/USOSWEB/src/backend/pkg/validation"
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
	// Validate input data
	if errors := validation.ValidateLoginRequest(req.Email, req.Password); len(errors) > 0 {
		authLog.LogWarn(fmt.Sprintf("Login validation failed: %s", errors.Error()))
		return &pb.LoginResponse{
			Message:   fmt.Sprintf("Validation failed: %s", errors.Error()),
			ExpiresIn: 0,
		}, status.Error(codes.InvalidArgument, errors.Error())
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
	authLog.LogInfo("Registration request received", logger.Fields{
		"email": req.Email,
		"name":  req.Name,
	})

	// 1. Walidacja danych wejściowych
	if err := s.validateRegisterRequest(req); err != nil {
		authLog.LogWarning("Registration validation failed", logger.Fields{
			"error": err.Error(),
			"email": req.Email,
		})
		return &pb.RegisterResponse{
			Success: false,
			Message: err.Error(),
			UserId:  0,
		}, nil
	}

	// 2. Sprawdzenie unikalności pól (email, PESEL, telefon, konto bankowe)
	conflicts, err := s.checkUniqueFields(req)
	if err != nil {
		authLog.LogError("Database error during uniqueness check", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Internal server error",
			UserId:  0,
		}, status.Error(codes.Internal, "Database error")
	}

	if len(conflicts) > 0 {
		conflictMsg := fmt.Sprintf("The following fields are already taken: %s", strings.Join(conflicts, ", "))
		authLog.LogWarning("Registration conflicts detected", logger.Fields{
			"email":     req.Email,
			"conflicts": conflicts,
		})
		return &pb.RegisterResponse{
			Success: false,
			Message: conflictMsg,
			UserId:  0,
		}, nil
	}

	// 3. Hashowanie hasła
	hashedPassword, err := s.hashPassword(req.Password)
	if err != nil {
		authLog.LogError("Password hashing failed", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Internal server error",
			UserId:  0,
		}, status.Error(codes.Internal, "Password hashing error")
	}

	// 4. Wstawienie użytkownika do bazy danych ze wszystkimi polami
	userID, err := s.createUserWithAllFields(req, hashedPassword)
	if err != nil {
		authLog.LogError("User creation failed", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to create user",
			UserId:  0,
		}, status.Error(codes.Internal, "User creation error")
	}

	// 5. Pobranie danych użytkownika do zwrócenia w odpowiedzi
	userData, err := s.getUserDataByID(userID)
	if err != nil {
		authLog.LogError("Failed to retrieve user data", err)
		// Sukces rejestracji, ale problem z pobraniem danych
		return &pb.RegisterResponse{
			Success: true,
			Message: "User registered successfully",
			UserId:  userID,
		}, nil
	}

	// 6. Cache: Zapisanie użytkownika w cache (jeśli dostępny)
	if s.cache != nil {
		user := &User{
			ID:       userID,
			Email:    req.Email,
			Password: hashedPassword,
			Active:   true,
		}

		// Cache user by email (dla logowania)
		emailCacheKey := cache.GenerateKey("auth", "user_by_email", req.Email)
		s.cache.Set(ctx, emailCacheKey, user, s.config.UserProfileTTL)

		// Cache user by ID
		idCacheKey := cache.GenerateKey("auth", "user_by_id", userID)
		s.cache.Set(ctx, idCacheKey, user, s.config.UserProfileTTL)

		// Cache user data
		userDataCacheKey := cache.GenerateKey("auth", "user_data", userID)
		s.cache.Set(ctx, userDataCacheKey, userData, s.config.UserProfileTTL)
	}

	authLog.LogInfo("User registered successfully", logger.Fields{
		"user_id": userID,
		"email":   req.Email,
		"name":    req.Name,
	})

	return &pb.RegisterResponse{
		Success:  true,
		Message:  "User registered successfully and is active",
		UserId:   userID,
		UserData: userData,
	}, nil
}

// validateRegisterRequest waliduje wszystkie pola z żądania rejestracji
func (s *AuthServer) validateRegisterRequest(req *pb.RegisterRequest) error {
	// Walidacja wymaganych pól
	if !validation.IsValidEmail(req.Email) {
		return fmt.Errorf("invalid email format")
	}

	if !validation.IsValidPassword(req.Password) {
		return fmt.Errorf("password must be at least 8 characters long and contain uppercase, lowercase, number and special character")
	}

	if len(req.Name) < 2 || len(req.Name) > 255 {
		return fmt.Errorf("name must be between 2 and 255 characters")
	}

	// Walidacja opcjonalnych pól (tylko jeśli są wypełnione)
	if req.Surname != "" && (len(req.Surname) < 2 || len(req.Surname) > 255) {
		return fmt.Errorf("surname must be between 2 and 255 characters")
	}

	if req.Pesel != "" && !validation.IsValidPESEL(req.Pesel) {
		return fmt.Errorf("invalid PESEL format")
	}

	if req.PhoneNr != "" && !validation.IsValidPhoneNumber(req.PhoneNr) {
		return fmt.Errorf("invalid phone number format")
	}

	if req.BankAccountNr != "" && !validation.IsValidBankAccount(req.BankAccountNr) {
		return fmt.Errorf("invalid bank account number format")
	}

	// Walidacja długości pól adresowych
	if len(req.PostalAddress) > 255 {
		return fmt.Errorf("postal address too long (max 255 characters)")
	}

	if len(req.RegistrationAddress) > 255 {
		return fmt.Errorf("registration address too long (max 255 characters)")
	}

	return nil
}

func (s *AuthServer) checkUniqueFields(req *pb.RegisterRequest) ([]string, error) {
	var conflicts []string

	if exists, err := s.checkFieldExists("email", req.Email); err != nil {
		return nil, err
	} else if exists {
		conflicts = append(conflicts, "email")
	}

	if req.Pesel != "" {
		if exists, err := s.checkFieldExists("pesel", req.Pesel); err != nil {
			return nil, err
		} else if exists {
			conflicts = append(conflicts, "PESEL")
		}
	}

	if req.PhoneNr != "" {
		if exists, err := s.checkFieldExists("phone_nr", req.PhoneNr); err != nil {
			return nil, err
		} else if exists {
			conflicts = append(conflicts, "phone number")
		}
	}

	if req.BankAccountNr != "" {
		if exists, err := s.checkFieldExists("bank_account_nr", req.BankAccountNr); err != nil {
			return nil, err
		} else if exists {
			conflicts = append(conflicts, "bank account number")
		}
	}

	return conflicts, nil
}

func (s *AuthServer) checkFieldExists(fieldName, value string) (bool, error) {
	var count int
	query := fmt.Sprintf("SELECT COUNT(*) FROM users WHERE %s = $1", fieldName)

	err := s.db.QueryRow(query, value).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("database query failed for field %s: %w", fieldName, err)
	}

	return count > 0, nil
}

func (s *AuthServer) createUserWithAllFields(req *pb.RegisterRequest, hashedPassword string) (int64, error) {
	var userID int64

	query := `
		INSERT INTO users (
			email, password, name, surname, pesel, phone_nr,
			postal_address, registration_address, bank_account_nr,
			active, activation_date
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING user_id`

	var surname, pesel, phoneNr, postalAddr, regAddr, bankAccount interface{}

	if req.Surname != "" {
		surname = req.Surname
	} else {
		surname = nil
	}

	if req.Pesel != "" {
		pesel = req.Pesel
	} else {
		pesel = nil
	}

	if req.PhoneNr != "" {
		phoneNr = req.PhoneNr
	} else {
		phoneNr = nil
	}

	if req.PostalAddress != "" {
		postalAddr = req.PostalAddress
	} else {
		postalAddr = nil
	}

	if req.RegistrationAddress != "" {
		regAddr = req.RegistrationAddress
	} else {
		regAddr = nil
	}

	if req.BankAccountNr != "" {
		bankAccount = req.BankAccountNr
	} else {
		bankAccount = nil
	}

	err := s.db.QueryRow(
		query,
		req.Email,      // $1 - email (NOT NULL)
		hashedPassword, // $2 - password (NOT NULL)
		req.Name,       // $3 - name (NOT NULL)
		surname,        // $4 - surname (NULL jeśli puste)
		pesel,          // $5 - pesel (NULL jeśli puste)
		phoneNr,        // $6 - phone_nr (NULL jeśli puste)
		postalAddr,     // $7 - postal_address (NULL jeśli puste)
		regAddr,        // $8 - registration_address (NULL jeśli puste)
		bankAccount,    // $9 - bank_account_nr (NULL jeśli puste)
		true,           // $10 - active = TRUE (od razu aktywny)
		time.Now(),     // $11 - activation_date = NOW()
	).Scan(&userID)

	if err != nil {
		return 0, fmt.Errorf("failed to insert user: %w", err)
	}

	authLog.LogInfo("User created in database", logger.Fields{
		"user_id":               userID,
		"email":                 req.Email,
		"has_surname":           req.Surname != "",
		"has_pesel":             req.Pesel != "",
		"has_phone":             req.PhoneNr != "",
		"has_postal_address":    req.PostalAddress != "",
		"has_registration_addr": req.RegistrationAddress != "",
		"has_bank_account":      req.BankAccountNr != "",
	})

	return userID, nil
}

func (s *AuthServer) getUserDataByID(userID int64) (*pb.UserData, error) {
	query := `
		SELECT
			user_id, name, surname, email, pesel, phone_nr,
			postal_address, registration_address, bank_account_nr,
			active, activation_date
		FROM users
		WHERE user_id = $1`

	var userData pb.UserData
	var surname, pesel, phoneNr, postalAddr, regAddr, bankAccount sql.NullString
	var activationDate sql.NullTime

	err := s.db.QueryRow(query, userID).Scan(
		&userData.UserId,
		&userData.Name,
		&surname,
		&userData.Email,
		&pesel,
		&phoneNr,
		&postalAddr,
		&regAddr,
		&bankAccount,
		&userData.Active,
		&activationDate,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to retrieve user data: %w", err)
	}

	// Konwersja NULL values do stringów (puste jeśli NULL)
	if surname.Valid {
		userData.Surname = surname.String
	}
	if pesel.Valid {
		userData.Pesel = pesel.String
	}
	if phoneNr.Valid {
		userData.PhoneNr = phoneNr.String
	}
	if postalAddr.Valid {
		userData.PostalAddress = postalAddr.String
	}
	if regAddr.Valid {
		userData.RegistrationAddress = regAddr.String
	}
	if bankAccount.Valid {
		userData.BankAccountNr = bankAccount.String
	}
	if activationDate.Valid {
		userData.ActivationDate = activationDate.Time.Format("2006-01-02 15:04:05")
	}

	// Rola - można później rozszerzyć o logikę sprawdzania w tabelach ról
	userData.Role = "user" // domyślnie

	return &userData, nil
}

// hashPassword hashuje hasło używając bcrypt
func (s *AuthServer) hashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
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
		claims, err := pb.ValidateToken(req.RefreshToken)
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
	// Validate input data
	if errors := validation.ValidateForgotPasswordRequest(req.Email); len(errors) > 0 {
		authLog.LogWarn(fmt.Sprintf("Forgot password validation failed: %s", errors.Error()))
		return &pb.ForgotPasswordResponse{
			Success: false,
			Message: fmt.Sprintf("Validation failed: %s", errors.Error()),
		}, status.Error(codes.InvalidArgument, errors.Error())
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
	if errors := validation.ValidateResetPasswordRequest(req.Token, req.NewPassword); len(errors) > 0 {
		authLog.LogWarn(fmt.Sprintf("Reset password validation failed: %s", errors.Error()))
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: fmt.Sprintf("Validation failed: %s", errors.Error()),
		}, status.Error(codes.InvalidArgument, errors.Error())
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
				Message:  "User found",
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

func (s *AuthServer) getUserRoleFromDB(ctx context.Context, userID int64) (UserRole, error) {
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM students WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return RoleUnknown, err
	}
	if exists {
		return RoleStudent, nil
	}

	err = s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM teaching_staff WHERE user_id = $1)", userID).Scan(&exists)
	if err != nil {
		return RoleUnknown, err
	}
	if exists {
		return RoleTeacher, nil
	}

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
		authLog.LogError(fmt.Sprintf("GetUsers: Error checking user role for user %d: %v", claims.UserID, err), err)
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
		authLog.LogError(fmt.Sprintf("GetUsers SQL error: %v", err), err)
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

// Helper functions
func generateResetToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}

func sendPasswordResetEmail(email, token string) bool {
	conn, err := grpc.Dial("messaging:3002", grpc.WithTransportCredentials(insecure.NewCredentials()))
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
