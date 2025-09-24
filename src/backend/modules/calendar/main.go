package main

import (
	"database/sql"
	"fmt"
	"net"
	"os"

	_ "github.com/lib/pq"
	pb "github.com/slomus/USOSWEB/src/backend/modules/calendar/gen/calendar"
	"github.com/slomus/USOSWEB/src/backend/modules/calendar/services"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

var log = logger.NewLogger("calendar-main")

func main() {
	log.LogInfo("Starting Calendar Service...")

	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "mysecretpassword")
	dbName := getEnv("DB_NAME", "mydb")
	dbSSLMode := getEnv("DB_SSLMODE", "disable")

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	log.LogInfo(fmt.Sprintf("Connecting to database at %s:%s", dbHost, dbPort))

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.LogError("Failed to connect to database", err)
		panic(err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.LogError("Failed to ping database", err)
		panic(err)
	}

	log.LogInfo("Database connection established")

	// gRPC server
	port := getEnv("GRPC_PORT", "3001")
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.LogError("Failed to listen", err)
		panic(err)
	}

	grpcServer := grpc.NewServer()

	calendarServer := calendar.NewCalendarServer(db)
	pb.RegisterCalendarServiceServer(grpcServer, calendarServer)

	reflection.Register(grpcServer)

	log.LogInfo(fmt.Sprintf("Calendar Service listening on port %s", port))

	if err := grpcServer.Serve(lis); err != nil {
		log.LogError("Failed to serve", err)
		panic(err)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
