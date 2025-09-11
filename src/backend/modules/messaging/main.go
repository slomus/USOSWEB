package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"strings"

	"github.com/slomus/USOSWEB/src/backend/configs"
	"github.com/slomus/USOSWEB/src/backend/modules/common/middleware"
	pb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
)

var appLog = logger.NewLogger("messaging-service")

type server struct {
	pb.UnimplementedMessagingServiceServer
	db *sql.DB
}

func (s *server) SendEmail(ctx context.Context, req *pb.SendEmailRequest) (*pb.SendEmailResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Sending email to: %s, subject: %s", req.To, req.Subject))

	// Walidacja podstawowa
	if req.To == "" {
		appLog.LogWarn("SendEmail called with empty 'to' field")
		return &pb.SendEmailResponse{
			Success: false,
			Message: "Recipient email is required",
		}, nil
	}

	if req.Subject == "" {
		appLog.LogWarn("SendEmail called with empty subject")
		return &pb.SendEmailResponse{
			Success: false,
			Message: "Email subject is required",
		}, nil
	}

	// W development mode - tylko logujemy email (zamiast rzeczywistego wysyłania)
	if configs.Envs.ENV == "development" {
		appLog.LogInfo("=== DEVELOPMENT MODE - EMAIL CONTENT ===")
		appLog.LogInfo(fmt.Sprintf("To: %s", req.To))
		appLog.LogInfo(fmt.Sprintf("From: %s", req.From))
		appLog.LogInfo(fmt.Sprintf("Subject: %s", req.Subject))
		appLog.LogInfo(fmt.Sprintf("Body: %s", req.Body))
		appLog.LogInfo("=== END EMAIL CONTENT ===")

		return &pb.SendEmailResponse{
			Success: true,
			Message: "Email logged successfully (development mode)",
		}, nil
	}

	// W production mode - rzeczywiste wysyłanie przez SMTP
	err := sendSMTPEmail(req.To, req.From, req.Subject, req.Body)
	if err != nil {
		appLog.LogError("Failed to send email via SMTP", err)
		return &pb.SendEmailResponse{
			Success: false,
			Message: fmt.Sprintf("Failed to send email: %v", err),
		}, nil
	}

	appLog.LogInfo(fmt.Sprintf("Email sent successfully to %s", req.To))
	return &pb.SendEmailResponse{
		Success: true,
		Message: "Email sent successfully",
	}, nil
}

func (s *server) SuggestEmail(ctx context.Context, req *pb.SuggestEmailRequest) (*pb.SuggestEmailResponse, error) {
	q := strings.TrimSpace(req.GetQ())
	if len(q) < 2 {
		return &pb.SuggestEmailResponse{Items: nil, Message: "Query too short"}, nil
	}

	limit := req.GetLimit()
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}

	scope := strings.ToLower(strings.TrimSpace(req.GetScope()))
	if scope == "" {
		scope = "all"
	}

	base := `
        SELECT u.user_id,
               u.email,
               COALESCE(NULLIF(TRIM(u.name || ' ' || COALESCE(u.surname, '')), ''), u.name, COALESCE(u.surname, '')) AS display_name
        FROM users u
        WHERE (LOWER(u.email) LIKE LOWER($1) || '%')
           OR (LOWER(u.name || ' ' || COALESCE(u.surname, '')) LIKE LOWER($1) || '%')
    `

	var whereScope string
	switch scope {
	case "students":
		whereScope = " AND EXISTS (SELECT 1 FROM students s WHERE s.user_id = u.user_id)"
	case "staff":
		whereScope = " AND (EXISTS (SELECT 1 FROM teaching_staff ts WHERE ts.user_id = u.user_id) OR EXISTS (SELECT 1 FROM administrative_staff a WHERE a.user_id = u.user_id))"
	default:
		whereScope = ""
	}

	finalQuery := base + whereScope + " ORDER BY u.email LIMIT $2"

	rows, err := s.db.QueryContext(ctx, finalQuery, q, limit)
	if err != nil {
		appLog.LogError("Failed to query email suggestions", err)
		return nil, fmt.Errorf("failed to query suggestions: %w", err)
	}
	defer rows.Close()

	var items []*pb.SuggestItem
	for rows.Next() {
		var it pb.SuggestItem
		if err := rows.Scan(&it.UserId, &it.Email, &it.DisplayName); err != nil {
			appLog.LogError("Failed to scan suggestion row", err)
			continue
		}
		items = append(items, &it)
	}

	return &pb.SuggestEmailResponse{Items: items, Message: "Suggestions retrieved successfully"}, nil
}

// sendSMTPEmail wysyła email przez SMTP (implementacja dla production)
func sendSMTPEmail(to, from, subject, body string) error {
	// Konfiguracja SMTP - w rzeczywistym środowisku powinno być w env variables
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	smtpUser := "your-email@gmail.com"
	smtpPass := "your-app-password"

	// Utworzenie wiadomości
	msg := []byte(fmt.Sprintf("To: %s\r\nFrom: %s\r\nSubject: %s\r\n\r\n%s\r\n", to, from, subject, body))

	// Konfiguracja auth
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	// Wysłanie emaila
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("SMTP send failed: %v", err)
	}

	return nil
}

func main() {
	appLog.LogInfo("Starting Messaging Service")

	// DB connection
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
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	lis, err := net.Listen("tcp", ":3002")
	if err != nil {
		appLog.LogError("Failed to listen on port :3002", err)
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer(
		grpc.UnaryInterceptor(middleware.AuthInterceptorWithDB(db)),
	)
	messagingServer := &server{db: db}

	pb.RegisterMessagingServiceServer(s, messagingServer)

	appLog.LogInfo("Messaging Service running on port :3002")
	appLog.LogInfo("Available endpoints:")
	appLog.LogInfo("  - POST /api/messaging/send-email")
	appLog.LogInfo("  - GET  /api/messaging/suggest-email")

	if err := s.Serve(lis); err != nil {
		appLog.LogError("Failed to start gRPC server", err)
		log.Fatalf("failed to serve: %v", err)
	}
}


curl -i -c /tmp/usos_cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"karol.kudlacz@edu.pl","password":"Password123!"}' \
  http://localhost:8083/api/auth/login