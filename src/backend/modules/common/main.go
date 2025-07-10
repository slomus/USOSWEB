package main

import (
	"context"
	"crypto/rand"
	"database/sql"
	"fmt"
	"log"
	"net"
	"time"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"github.com/slomus/USOSWEB/src/backend/modules/common/middleware"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"github.com/slomus/USOSWEB/src/backend/pkg/validation"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

var appLog = logger.NewLogger("auth-service")

type server struct {
	pb.UnimplementedAuthServiceServer
	pb.UnimplementedAuthHelloServer
	db *sql.DB
}

type TokenContext struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int32
}

func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	// Validate input data
	if errors := validation.ValidateRegisterRequest(req.Email, req.Password); len(errors) > 0 {
		appLog.LogWarn(fmt.Sprintf("Registration validation failed: %s", errors.Error()))
		return &pb.RegisterResponse{
			Success: false,
			Message: fmt.Sprintf("Validation failed: %s", errors.Error()),
		}, nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		appLog.LogError("Failed to hash password", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to hash password",
		}, nil
	}

	var userID int
	err = s.db.QueryRow(
		"INSERT INTO users (email, password) VALUES ($1, $2) RETURNING user_id",
		req.Email, string(hashedPassword),
	).Scan(&userID)

	if err != nil {
		appLog.LogError("Failed to create user", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "User registration failed",
		}, nil
	}

	appLog.LogInfo(fmt.Sprintf("User registered successfully with ID: %d", userID))
	return &pb.RegisterResponse{
		Success: true,
		Message: "User registered successfully",
		UserId:  int64(userID),
	}, nil
}

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	// Validate input data
	if errors := validation.ValidateLoginRequest(req.Email, req.Password); len(errors) > 0 {
		appLog.LogWarn(fmt.Sprintf("Login validation failed: %s", errors.Error()))
		return &pb.LoginResponse{
			Message:   fmt.Sprintf("Validation failed: %s", errors.Error()),
			ExpiresIn: 0,
		}, status.Error(codes.InvalidArgument, errors.Error())
	}

	var userID int
	var hashedPassword string
	err := s.db.QueryRow("SELECT user_id, password FROM users WHERE email = $1", req.Email).Scan(&userID, &hashedPassword)
	if err != nil {
		appLog.LogWarn(fmt.Sprintf("Login attempt for non-existent email: %s", req.Email))
		return &pb.LoginResponse{
			Message:   "Invalid credentials",
			ExpiresIn: 0,
		}, nil
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		appLog.LogWarn(fmt.Sprintf("Failed login attempt for email: %s", req.Email))
		return &pb.LoginResponse{
			Message:   "Invalid credentials",
			ExpiresIn: 0,
		}, nil
	}

	accessToken, refreshToken, err := auth.GenerateTokens(int64(userID))
	if err != nil {
		appLog.LogError("Token generation failed", err)
		return &pb.LoginResponse{
			Message:   "Token generation failed",
			ExpiresIn: 0,
		}, nil
	}
	md := metadata.Pairs(
		"x-access-token", accessToken,
		"x-refresh-token", refreshToken,
		"x-expires-in", "3600",
	)
	grpc.SendHeader(ctx, md)

	appLog.LogInfo(fmt.Sprintf("User %d logged in successfully", userID))
	return &pb.LoginResponse{
		Message:   "Login successful",
		ExpiresIn: 3600,
	}, nil
}

func (s *server) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
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

	newAccessToken, _, err := auth.GenerateTokens(claims.UserID)
	if err != nil {
		return &pb.RefreshTokenResponse{
			Message:   "Token generation failed",
			ExpiresIn: 0,
		}, nil
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

func (s *server) Logout(ctx context.Context, req *pb.LogoutRequest) (*pb.LogoutResponse, error) {
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

func (s *server) ForgotPassword(ctx context.Context, req *pb.ForgotPasswordRequest) (*pb.ForgotPasswordResponse, error) {
	// Validate input data
	if errors := validation.ValidateForgotPasswordRequest(req.Email); len(errors) > 0 {
		appLog.LogWarn(fmt.Sprintf("Forgot password validation failed: %s", errors.Error()))
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
		appLog.LogInfo(fmt.Sprintf("Password reset requested for non-existent email: %s", req.Email))
		return &pb.ForgotPasswordResponse{
			Success: true,
			Message: "If email exists, reset instructions have been sent",
		}, nil
	}

	// Generate reset token
	resetToken := generateResetToken()
	expiresAt := time.Now().Add(1 * time.Hour) // 1 hour expiry

	// Store reset token
	_, err = s.db.Exec(
		"INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
		userID, resetToken, expiresAt,
	)
	if err != nil {
		appLog.LogError("Failed to store reset token", err)
		return &pb.ForgotPasswordResponse{
			Success: false,
			Message: "Failed to process password reset",
		}, nil
	}

	// TODO: Send email via messaging service
	// For now, log the reset token
	appLog.LogInfo(fmt.Sprintf("Password reset token generated for %s: %s", email, resetToken))

	return &pb.ForgotPasswordResponse{
		Success: true,
		Message: "If email exists, reset instructions have been sent",
	}, nil
}

func (s *server) ResetPassword(ctx context.Context, req *pb.ResetPasswordRequest) (*pb.ResetPasswordResponse, error) {
	// Validate input data
	if errors := validation.ValidateResetPasswordRequest(req.Token, req.NewPassword); len(errors) > 0 {
		appLog.LogWarn(fmt.Sprintf("Reset password validation failed: %s", errors.Error()))
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: fmt.Sprintf("Validation failed: %s", errors.Error()),
		}, status.Error(codes.InvalidArgument, errors.Error())
	}

	// Validate reset token
	var userID int
	var expiresAt time.Time
	var used bool
	err := s.db.QueryRow(
		"SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = $1",
		req.Token,
	).Scan(&userID, &expiresAt, &used)

	if err != nil {
		appLog.LogWarn(fmt.Sprintf("Invalid reset token attempted: %s", req.Token))
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Invalid or expired reset token",
		}, nil
	}

	if used {
		appLog.LogWarn(fmt.Sprintf("Attempt to reuse reset token for user %d", userID))
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Reset token has already been used",
		}, nil
	}

	if time.Now().After(expiresAt) {
		appLog.LogWarn(fmt.Sprintf("Expired reset token attempted for user %d", userID))
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Reset token has expired",
		}, nil
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		appLog.LogError("Failed to hash new password", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to process password reset",
		}, nil
	}

	// Update password and mark token as used
	tx, err := s.db.Begin()
	if err != nil {
		appLog.LogError("Failed to begin transaction", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to process password reset",
		}, nil
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE users SET password = $1 WHERE user_id = $2", string(hashedPassword), userID)
	if err != nil {
		appLog.LogError("Failed to update password", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to update password",
		}, nil
	}

	_, err = tx.Exec("UPDATE password_reset_tokens SET used = TRUE WHERE token = $1", req.Token)
	if err != nil {
		appLog.LogError("Failed to mark token as used", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to mark token as used",
		}, nil
	}

	err = tx.Commit()
	if err != nil {
		appLog.LogError("Failed to commit transaction", err)
		return &pb.ResetPasswordResponse{
			Success: false,
			Message: "Failed to complete password reset",
		}, nil
	}

	appLog.LogInfo(fmt.Sprintf("Password reset successfully for user %d", userID))
	return &pb.ResetPasswordResponse{
		Success: true,
		Message: "Password has been reset successfully",
	}, nil
}

func generateResetToken() string {
	// Generate a random 32-byte token
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return fmt.Sprintf("%x", bytes)
}

func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloResponse, error) {
	userID := ctx.Value("user_id")
	if userID == nil {
		return &pb.HelloResponse{
			Message: "Hello, anonymous user",
		}, nil
	}

	return &pb.HelloResponse{
		Message: "Hello, authenticated user",
	}, nil
}

func main() {
	appLog.LogInfo("Starting Auth Service")

	pgConfig := configs.PostgresConfig{
		Host:     configs.Envs.DBHost,
		Port:     configs.Envs.DBPort,
		User:     configs.Envs.DBUser,
		Password: configs.Envs.DBPassword,
		DBName:   configs.Envs.DBName,
		SSLMode:  configs.Envs.DBSSLMode,
	}

	db, err := configs.NewPostgresStorage(pgConfig)
	if err != nil {
		appLog.LogError("Failed to connect to database", err)
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		appLog.LogError("Failed to ping database", err)
		log.Fatalf("Failed to ping database: %v", err)
	}

	appLog.LogInfo("Database connection established")

	lis, err := net.Listen("tcp", ":3003")
	if err != nil {
		appLog.LogError("Failed to listen on port :3003", err)
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(middleware.AuthInterceptorWithDB(db)),
	)
	authServer := &server{db: db}

	pb.RegisterAuthHelloServer(s, authServer)
	pb.RegisterAuthServiceServer(s, authServer)

	appLog.LogInfo("Auth Service running on port :3003")
	if err := s.Serve(lis); err != nil {
		appLog.LogError("Failed to start gRPC server", err)
		log.Fatalf("failed to serve: %v", err)
	}
}
