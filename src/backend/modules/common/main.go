package main

import (
	"context"
	"database/sql"
	"log"
	"net"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"github.com/slomus/USOSWEB/src/backend/modules/common/middleware"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc"
)

type User struct {
	ID       int64
	Name     string
	Password string
}

type server struct {
	pb.UnimplementedAuthHelloServer
	pb.UnimplementedAuthServiceServer
	db *sql.DB
}

// NOTE: hello endpoint
func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloResponse, error) {
	return &pb.HelloResponse{Message: "Czesc tu common"}, nil
}

// NOTE: register endpoint
func (s *server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	if req.Name == "" || req.Password == "" {
		return &pb.RegisterResponse{
			Success: false,
			Message: "Name and password are required",
		}, nil
	}

	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE name = $1)", req.Name).Scan(&exists)
	if err != nil {
		log.Printf("Database error: %v", err)
		return &pb.RegisterResponse{Success: false, Message: "User already exists"}, nil
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Hash error: %v", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Password error",
		}, nil
	}

	var userID int64
	err = s.db.QueryRow(
		"INSERT INTO users (name, password) VALUES ($1, $2) RETURNING user_id", req.Name, string(hashedPassword),
	).Scan(&userID)
	if err != nil {
		log.Printf("Insert error: %v", err)
		return &pb.RegisterResponse{
			Success: false,
			Message: "Insert error",
		}, nil
	}

	return &pb.RegisterResponse{
		Success: true,
		Message: "User registered",
		UserId:  userID,
	}, nil
}

//NOTE: Login endpoint

func (s *server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	if req.Name == "" || req.Password == "" {
		return &pb.LoginResponse{
			AccessToken:  "",
			RefreshToken: "",
			ExpiresIn:    0,
		}, nil
	}

	var user User
	var hashedPassword string
	err := s.db.QueryRow(
		"SELECT user_id, name, password FROM users WHERE name = $1", req.Name,
	).Scan(&user.ID, &user.Name, &hashedPassword)
	if err == sql.ErrNoRows {
		return &pb.LoginResponse{}, nil
	} else if err != nil {
		log.Printf("DB error: %v", err)
		return &pb.LoginResponse{}, nil
	}

	err = bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password))
	if err != nil {
		return &pb.LoginResponse{}, nil
	}

	accessToken, refreshToken, err := auth.GenerateTokens(user.ID)
	if err != nil {
		log.Printf("Token generattion error: %v", err)
		return &pb.LoginResponse{}, nil
	}

	expiresIn := int64(configs.Envs.JWTAccessTokenExpiry) * 60 // w sekundach

	return &pb.LoginResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
	}, nil
}

// NOTE: RefreshToken endpoint
func (s *server) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	claims, err := auth.ValidateToken(req.RefreshToken)
	if err != nil {
		return &pb.RefreshTokenResponse{}, nil
	}

	accessToken, refreshToken, err := auth.GenerateTokens(claims.UserID)
	if err != nil {
		log.Printf("Token refresh error: %v", err)
		return &pb.RefreshTokenResponse{}, nil
	}

	expiresIn := int64(configs.Envs.JWTAccessTokenExpiry) * 60 // w sekundach

	return &pb.RefreshTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    expiresIn,
	}, nil
}

func main() {

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
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	lis, err := net.Listen("tcp", ":3003")
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(middleware.AuthInterceptor),
	)
	authServer := &server{db: db}

	pb.RegisterAuthHelloServer(s, authServer)
	pb.RegisterAuthServiceServer(s, authServer)

	log.Println("gRPC server running on port :3003")
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}

}
