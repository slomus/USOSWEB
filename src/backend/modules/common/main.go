package main

import (
	"context"
	"fmt"
	"github.com/slomus/USOSWEB/src/backend/configs"
	authPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	coursePb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/course"
	"github.com/slomus/USOSWEB/src/backend/modules/common/services/auth"
	"github.com/slomus/USOSWEB/src/backend/modules/common/services/courses"
	"github.com/slomus/USOSWEB/src/backend/pkg/cache"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"net"
)

var appLog = logger.NewLogger("common-service")

func main() {
	appLog.LogInfo("Starting Common Service")

	// Połączenie z bazą danych
	db, err := configs.NewPostgresStorage(configs.PostgresConfig{
		Host:     configs.Envs.DBHost,
		Port:     configs.Envs.DBPort,
		User:     configs.Envs.DBUser,
		Password: configs.Envs.DBPassword,
		DBName:   configs.Envs.DBName,
		SSLMode:  configs.Envs.DBSSLMode,
	})
	if err != nil {
		appLog.LogError("Failed to connect to database", err)
		panic(err)
	}
	defer db.Close()

	// Redis connection string construction
	redisAddr := configs.Envs.GetRedisEndpoint()
	appLog.LogInfo(fmt.Sprintf("Attempting to connect to Redis at: %s", redisAddr))

	redisCache := cache.NewRedisCache(
		redisAddr,
		configs.Envs.RedisPassword,
		configs.Envs.RedisDB,
	)
	defer redisCache.Close() // Redis connection test
	ctx := context.Background()
	if err := redisCache.Ping(ctx); err != nil {
		appLog.LogError("Failed to connect to Redis", err)
		panic(err)
	}

	appLog.LogInfo("Redis connection established")
	appLog.LogInfo("Database connection established")

	// Tworzenie serwera gRPC
	lis, err := net.Listen("tcp", ":3003")
	if err != nil {
		appLog.LogError("Failed to listen on port 3003", err)
		panic(err)
	}

	grpcServer := grpc.NewServer()

	// Tworzenie instancji serwisów
	authServer := auth.NewAuthServerWithCache(db, redisCache)
	courseServer := course.NewCourseServerWithCache(db, redisCache)

	// Rejestracja serwisów Auth
	authPb.RegisterAuthServiceServer(grpcServer, authServer)
	appLog.LogInfo("AuthService registered")

	// Rejestracja serwisu Course
	coursePb.RegisterCourseServiceServer(grpcServer, courseServer)
	appLog.LogInfo("CourseService registered")

	appLog.LogInfo("Common Service registered and listening on :3003")
	appLog.LogInfo("Available services:")
	appLog.LogInfo("   AuthService:")
	appLog.LogInfo("    - POST /api/auth/login")
	appLog.LogInfo("    - POST /api/auth/register")
	appLog.LogInfo("    - POST /api/auth/refresh")
	appLog.LogInfo("    - POST /api/auth/logout")
	appLog.LogInfo("    - POST /api/auth/forgot-password")
	appLog.LogInfo("    - POST /api/auth/reset-password")
	appLog.LogInfo("   CourseService:")
	appLog.LogInfo("    - GET  /api/courses")
	appLog.LogInfo("    - GET  /api/courses/{id}")
	appLog.LogInfo("    - GET  /api/courses/{id}/subjects")
	appLog.LogInfo("    - GET  /api/courses/search")
	appLog.LogInfo("    - GET  /api/courses/stats")
	appLog.LogInfo("    - GET  /api/faculties")
	appLog.LogInfo("    - GET  /api/student/course-info/{album_nr}")

	if err := grpcServer.Serve(lis); err != nil {
		appLog.LogError("Failed to serve gRPC server", err)
		panic(err)
	}
}
