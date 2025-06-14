package main

import (
	"context"
	"database/sql"
	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"github.com/slomus/USOSWEB/src/backend/modules/common/middleware"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"log"
	"net"
	"time"
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
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return &pb.RegisterResponse{
			Success: false,
			Message: "Failed to hash password",
		}, nil
	}

	var userID int
	err = s.db.QueryRow(
		"INSERT INTO users (name, password) VALUES ($1, $2) RETURNING user_id",
		req.Name, string(hashedPassword),
	).Scan(&userID)

	if err != nil {
		log.Printf("Failed to create user: %v", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "User registration failed",
		}, nil
	}

	return &pb.RegisterResponse{
		Success: true,
		Message: "User registered successfully",
		UserId:  int64(userID),
	}, nil
}

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	var userID int
	var hashedPassword string
	err := s.db.QueryRow("SELECT user_id, password FROM users WHERE name = $1", req.Name).Scan(&userID, &hashedPassword)
	if err != nil {
		return &pb.LoginResponse{
			Message:   "Invalid credentials",
			ExpiresIn: 0,
		}, nil
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		return &pb.LoginResponse{
			Message:   "Invalid credentials",
			ExpiresIn: 0,
		}, nil
	}

	accessToken, refreshToken, err := auth.GenerateTokens(int64(userID))
	if err != nil {
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
