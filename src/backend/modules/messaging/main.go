package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/smtp"

	"github.com/slomus/USOSWEB/src/backend/configs"
	pb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
)

var appLog = logger.NewLogger("messaging-service")

type server struct {
	pb.UnimplementedMessagingServiceServer
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

	lis, err := net.Listen("tcp", ":3002")
	if err != nil {
		appLog.LogError("Failed to listen on port :3002", err)
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer()
	messagingServer := &server{}

	pb.RegisterMessagingServiceServer(s, messagingServer)

	appLog.LogInfo("Messaging Service running on port :3002")
	appLog.LogInfo("Available endpoints:")
	appLog.LogInfo("  - SendEmail (gRPC): sends emails via SMTP or logs in development")

	if err := s.Serve(lis); err != nil {
		appLog.LogError("Failed to start gRPC server", err)
		log.Fatalf("failed to serve: %v", err)
	}
}

