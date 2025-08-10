package auth

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
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
	if errors := validation.ValidateRegisterRequest(req.Email, req.Password); len(errors) > 0 {
		authLog.LogWarn(fmt.Sprintf("Register validation failed: %s", errors.Error()))
		return &pb.RegisterResponse{
			Success: false,
			Message: fmt.Sprintf("Validation failed: %s", errors.Error()),
			UserId:  0,
		}, status.Error(codes.InvalidArgument, errors.Error())
	}

	var existingUserID int
	err := s.db.QueryRow("SELECT user_id FROM users WHERE email = $1", req.Email).Scan(&existingUserID)
	if err == nil {
		authLog.LogWarn(fmt.Sprintf("Registration attempt with existing email: %s", req.Email))
		return &pb.RegisterResponse{
			Success: false,
			Message: "User with this email already exists",
			UserId:  0,
		}, nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		authLog.LogError("Password hashing failed", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to process password",
			UserId:  0,
		}, nil
	}

	var userID int
	err = s.db.QueryRow(
		"INSERT INTO users (email, password, name, active, activation_date) VALUES ($1, $2, $3, $4, $5) RETURNING user_id",
		req.Email, string(hashedPassword), req.Name, true, time.Now(),
	).Scan(&userID)

	if err != nil {
		authLog.LogError("User insertion failed", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to create user",
			UserId:  0,
		}, nil
	}

	authLog.LogInfo(fmt.Sprintf("User registered successfully with ID: %d, name: %s", userID, req.Name))
	return &pb.RegisterResponse{
		Success: true,
		Message: "User registered successfully",
		UserId:  int64(userID),
	}, nil
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
		}, nil
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		authLog.LogWarn("GetUserName: Brak tokenu w authorization")
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Brak tokenu autoryzacji",
			Success:  false,
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
		}, nil
	}

	var name string
	err = s.db.QueryRow("SELECT name FROM users WHERE user_id = $1", claims.UserID).Scan(&name)
	if err != nil {
		authLog.LogError("Failed to fetch user name", err)
		return &pb.GetUserNameResponse{
			Username: "",
			Message:  "Użytkownik nie znaleziony",
			Success:  false,
		}, nil
	}

	authLog.LogInfo(fmt.Sprintf("Username retrieved for user ID: %d", claims.UserID))
	return &pb.GetUserNameResponse{
		Username: name,
		Message:  "Username pobrany pomyślnie",
		Success:  true,
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
