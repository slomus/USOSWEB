package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/smtp"
	"sort"
	"strings"
	"time"

	"github.com/emersion/go-imap"
	"github.com/emersion/go-imap/client"
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
	// Pobierz zalogowanego usera i jego app password
	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.SendEmailResponse{Success: false, Message: "User not authenticated"}, nil
	}
	var userEmail, appPass string
	if err := s.db.QueryRow("SELECT email, COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userEmail, &appPass); err != nil || strings.TrimSpace(appPass) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.SendEmailResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}
	err := sendSMTPEmail(req.To, req.From, req.Subject, req.Body, userEmail, appPass)
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
func sendSMTPEmail(to, from, subject, body string, smtpUser, smtpPass string) error {
	// Konfiguracja SMTP - w rzeczywistym środowisku powinno być w env variables
	smtpHost := "smtp.wp.pl"
	smtpPort := "465"
	// smtpUser/smtpPass przekazywane per-user

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

// connectToIMAP - helper to connect and login to IMAP server
func connectToIMAP(email, password string) (*client.Client, error) {
	imapHost := "imap.wp.pl"
	imapPort := "993"

	c, err := client.DialTLS(fmt.Sprintf("%s:%s", imapHost, imapPort), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to IMAP server: %v", err)
	}

	if err := c.Login(email, password); err != nil {
		_ = c.Logout()
		return nil, fmt.Errorf("failed to login to IMAP: %v", err)
	}

	appLog.LogInfo(fmt.Sprintf("Connected to IMAP with credentials: %s", email))
	return c, nil
}

// GetEmail - fetches a single email by UID from IMAP
func (s *server) GetEmail(ctx context.Context, req *pb.GetEmailRequest) (*pb.GetEmailResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Getting email UID: %s", req.EmailUid))

	if strings.TrimSpace(req.EmailUid) == "" {
		return &pb.GetEmailResponse{Success: false, Message: "Email UID is required"}, nil
	}

	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.GetEmailResponse{Success: false, Message: "User not authenticated"}, nil
	}

	var userEmail string
	if err := s.db.QueryRow("SELECT email FROM users WHERE user_id = $1", userID).Scan(&userEmail); err != nil {
		appLog.LogError("Failed to get user data", err)
		return &pb.GetEmailResponse{Success: false, Message: "User not found"}, nil
	}

	var userPassword string
	if err := s.db.QueryRow("SELECT COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userPassword); err != nil || strings.TrimSpace(userPassword) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.GetEmailResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}

	c, err := connectToIMAP(userEmail, userPassword)
	if err != nil {
		appLog.LogError("Failed to connect to IMAP", err)
		return &pb.GetEmailResponse{Success: false, Message: "Failed to connect to email server"}, nil
	}
	defer c.Logout()

	if _, err := c.Select("INBOX", false); err != nil {
		appLog.LogError("Failed to select INBOX", err)
		return &pb.GetEmailResponse{Success: false, Message: "Failed to access inbox"}, nil
	}

	seqSet := new(imap.SeqSet)
	uid, err := imap.ParseNumber(req.EmailUid)
	if err != nil {
		return &pb.GetEmailResponse{Success: false, Message: "Invalid email UID format"}, nil
	}
	seqSet.AddNum(uid)

	section := &imap.BodySectionName{}
	items := []imap.FetchItem{section.FetchItem(), imap.FetchEnvelope, imap.FetchFlags}
	messages := make(chan *imap.Message, 1)
	go func() {
		_ = c.Fetch(seqSet, items, messages)
	}()

	msg := <-messages
	if msg == nil {
		return &pb.GetEmailResponse{Success: false, Message: "Email not found"}, nil
	}

	isRead := false
	for _, flag := range msg.Flags {
		if flag == imap.SeenFlag {
			isRead = true
			break
		}
	}

	env := msg.Envelope
	senderEmail, senderName := "", ""
	if len(env.From) > 0 {
		senderEmail = env.From[0].Address()
		senderName = env.From[0].PersonalName
	}

	return &pb.GetEmailResponse{
		Success:     true,
		Message:     "Email retrieved successfully",
		EmailUid:    req.EmailUid,
		SenderEmail: senderEmail,
		SenderName:  senderName,
		Title:       env.Subject,
		Content:     "Email content (MIME parsing TBD)",
		SendDate:    env.Date.Format(time.RFC3339),
		IsRead:      isRead,
	}, nil
}

// DeleteEmail - removes an email by UID
func (s *server) DeleteEmail(ctx context.Context, req *pb.DeleteEmailRequest) (*pb.DeleteEmailResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Deleting email UID: %s", req.EmailUid))
	if strings.TrimSpace(req.EmailUid) == "" {
		return &pb.DeleteEmailResponse{Success: false, Message: "Email UID is required"}, nil
	}

	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.DeleteEmailResponse{Success: false, Message: "User not authenticated"}, nil
	}

	var userEmail string
	if err := s.db.QueryRow("SELECT email FROM users WHERE user_id = $1", userID).Scan(&userEmail); err != nil {
		appLog.LogError("Failed to get user data", err)
		return &pb.DeleteEmailResponse{Success: false, Message: "User not found"}, nil
	}
	var userPassword string
	if err := s.db.QueryRow("SELECT COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userPassword); err != nil || strings.TrimSpace(userPassword) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.DeleteEmailResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}

	c, err := connectToIMAP(userEmail, userPassword)
	if err != nil {
		appLog.LogError("Failed to connect to IMAP", err)
		return &pb.DeleteEmailResponse{Success: false, Message: "Failed to connect to email server"}, nil
	}
	defer c.Logout()

	if _, err := c.Select("INBOX", false); err != nil {
		appLog.LogError("Failed to select INBOX", err)
		return &pb.DeleteEmailResponse{Success: false, Message: "Failed to access inbox"}, nil
	}

	seqSet := new(imap.SeqSet)
	uid, err := imap.ParseNumber(req.EmailUid)
	if err != nil {
		return &pb.DeleteEmailResponse{Success: false, Message: "Invalid email UID format"}, nil
	}
	seqSet.AddNum(uid)

	item := imap.FormatFlagsOp(imap.AddFlags, true)
	flags := []interface{}{imap.DeletedFlag}
	// Use UID-based store to target by UID, not sequence number
	if err := c.UidStore(seqSet, item, flags, nil); err != nil {
		appLog.LogError("Failed to mark email for deletion", err)
		return &pb.DeleteEmailResponse{Success: false, Message: "Failed to mark email for deletion"}, nil
	}

	if err := c.Expunge(nil); err != nil {
		appLog.LogError("Failed to delete email", err)
		return &pb.DeleteEmailResponse{Success: false, Message: "Failed to delete email"}, nil
	}

	return &pb.DeleteEmailResponse{Success: true, Message: "Email deleted successfully"}, nil
}

// SetEmailRead - marks an email as read
func (s *server) SetEmailRead(ctx context.Context, req *pb.SetEmailReadRequest) (*pb.SetEmailReadResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Setting email as read, UID: %s", req.EmailUid))
	if strings.TrimSpace(req.EmailUid) == "" {
		return &pb.SetEmailReadResponse{Success: false, Message: "Email UID is required"}, nil
	}

	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.SetEmailReadResponse{Success: false, Message: "User not authenticated"}, nil
	}

	var userEmail string
	if err := s.db.QueryRow("SELECT email FROM users WHERE user_id = $1", userID).Scan(&userEmail); err != nil {
		appLog.LogError("Failed to get user data", err)
		return &pb.SetEmailReadResponse{Success: false, Message: "User not found"}, nil
	}
	var userPassword string
	if err := s.db.QueryRow("SELECT COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userPassword); err != nil || strings.TrimSpace(userPassword) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.SetEmailReadResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}

	c, err := connectToIMAP(userEmail, userPassword)
	if err != nil {
		appLog.LogError("Failed to connect to IMAP", err)
		return &pb.SetEmailReadResponse{Success: false, Message: "Failed to connect to email server"}, nil
	}
	defer c.Logout()

	if _, err := c.Select("INBOX", false); err != nil {
		appLog.LogError("Failed to select INBOX", err)
		return &pb.SetEmailReadResponse{Success: false, Message: "Failed to access inbox"}, nil
	}

	seqSet := new(imap.SeqSet)
	uid, err := imap.ParseNumber(req.EmailUid)
	if err != nil {
		return &pb.SetEmailReadResponse{Success: false, Message: "Invalid email UID format"}, nil
	}
	seqSet.AddNum(uid)

	item := imap.FormatFlagsOp(imap.AddFlags, true)
	flags := []interface{}{imap.SeenFlag}
	// Use UID-based store to target by UID, not sequence number
	if err := c.UidStore(seqSet, item, flags, nil); err != nil {
		appLog.LogError("Failed to mark email as read", err)
		return &pb.SetEmailReadResponse{Success: false, Message: "Failed to mark email as read"}, nil
	}

	return &pb.SetEmailReadResponse{Success: true, Message: "Email marked as read"}, nil
}

// SetEmailUnread - marks an email as unread
func (s *server) SetEmailUnread(ctx context.Context, req *pb.SetEmailUnReadRequest) (*pb.SetEmailUnReadResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Setting email as unread, UID: %s", req.EmailUid))
	if strings.TrimSpace(req.EmailUid) == "" {
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Email UID is required"}, nil
	}

	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.SetEmailUnReadResponse{Success: false, Message: "User not authenticated"}, nil
	}

	var userEmail string
	if err := s.db.QueryRow("SELECT email FROM users WHERE user_id = $1", userID).Scan(&userEmail); err != nil {
		appLog.LogError("Failed to get user data", err)
		return &pb.SetEmailUnReadResponse{Success: false, Message: "User not found"}, nil
	}
	var userPassword string
	if err := s.db.QueryRow("SELECT COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userPassword); err != nil || strings.TrimSpace(userPassword) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}

	c, err := connectToIMAP(userEmail, userPassword)
	if err != nil {
		appLog.LogError("Failed to connect to IMAP", err)
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Failed to connect to email server"}, nil
	}
	defer c.Logout()

	if _, err := c.Select("INBOX", false); err != nil {
		appLog.LogError("Failed to select INBOX", err)
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Failed to access inbox"}, nil
	}

	seqSet := new(imap.SeqSet)
	uid, err := imap.ParseNumber(req.EmailUid)
	if err != nil {
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Invalid email UID format"}, nil
	}
	seqSet.AddNum(uid)

	// Remove the Seen flag to mark as unread
	item := imap.FormatFlagsOp(imap.RemoveFlags, true)
	flags := []interface{}{imap.SeenFlag}
	// Use UID-based store to target by UID, not sequence number
	if err := c.UidStore(seqSet, item, flags, nil); err != nil {
		appLog.LogError("Failed to mark email as unread", err)
		return &pb.SetEmailUnReadResponse{Success: false, Message: "Failed to mark email as unread"}, nil
	}

	return &pb.SetEmailUnReadResponse{Success: true, Message: "Email marked as unread"}, nil
}

// GetAllEmails - fetches list of emails with pagination
func (s *server) GetAllEmails(ctx context.Context, req *pb.GetAllEmailsRequest) (*pb.GetAllEmailsResponse, error) {
	appLog.LogInfo(fmt.Sprintf("Getting all emails with limit: %d, offset: %d", req.Limit, req.Offset))

	userID, ok := ctx.Value("user_id").(int64)
	if !ok {
		return &pb.GetAllEmailsResponse{Success: false, Message: "User not authenticated"}, nil
	}

	var userEmail string
	if err := s.db.QueryRow("SELECT email FROM users WHERE user_id = $1", userID).Scan(&userEmail); err != nil {
		appLog.LogError("Failed to get user data", err)
		return &pb.GetAllEmailsResponse{Success: false, Message: "User not found"}, nil
	}
	var userPassword string
	if err := s.db.QueryRow("SELECT COALESCE(email_app_password, '') FROM users WHERE user_id = $1", userID).Scan(&userPassword); err != nil || strings.TrimSpace(userPassword) == "" {
		appLog.LogWarn("Missing email_app_password for user")
		return &pb.GetAllEmailsResponse{Success: false, Message: "Email app password not set for this user"}, nil
	}

	c, err := connectToIMAP(userEmail, userPassword)
	if err != nil {
		appLog.LogError("Failed to connect to IMAP", err)
		return &pb.GetAllEmailsResponse{Success: false, Message: "Failed to connect to email server"}, nil
	}
	defer c.Logout()

	mbox, err := c.Select("INBOX", false)
	if err != nil {
		appLog.LogError("Failed to select INBOX", err)
		return &pb.GetAllEmailsResponse{Success: false, Message: "Failed to access inbox"}, nil
	}

	limit := int(req.Limit)
	if limit <= 0 {
		limit = 50
	}
	offset := int(req.Offset)
	if offset < 0 {
		offset = 0
	}

	// Build IMAP sequence set to fetch newest messages first (by sequence number)
	seqSet := new(imap.SeqSet)
	if mbox.Messages > 0 {
		// endSeq is the newest message sequence number after applying offset
		var endSeq uint32
		if uint32(offset) >= mbox.Messages {
			// Offset beyond available messages => empty set
			endSeq = 0
		} else {
			endSeq = mbox.Messages - uint32(offset)
		}

		if endSeq > 0 {
			// startSeq is endSeq - limit + 1 (clamped to 1)
			startSeq := uint32(1)
			if endSeq >= uint32(limit) {
				startSeq = endSeq - uint32(limit) + 1
			}
			seqSet.AddRange(startSeq, endSeq)
		}
	}

	items := []imap.FetchItem{imap.FetchEnvelope, imap.FetchFlags, imap.FetchUid}
	messages := make(chan *imap.Message, 10)
	go func() { _ = c.Fetch(seqSet, items, messages) }()

	var emails []*pb.EmailSummary
	totalCount := int32(mbox.Messages)
	for msg := range messages {
		if msg == nil {
			continue
		}
		isRead := false
		for _, flag := range msg.Flags {
			if flag == imap.SeenFlag {
				isRead = true
				break
			}
		}
		env := msg.Envelope
		senderEmail, senderName := "", ""
		if len(env.From) > 0 {
			senderEmail = env.From[0].Address()
			senderName = env.From[0].PersonalName
		}
		emails = append(emails, &pb.EmailSummary{
			EmailUid:    fmt.Sprintf("%d", msg.Uid),
			SenderEmail: senderEmail,
			SenderName:  senderName,
			Title:       env.Subject,
			SendDate:    env.Date.Format(time.RFC3339),
			IsRead:      isRead,
		})
	}

	// Sort by SendDate desc for stable ordering
	sort.SliceStable(emails, func(i, j int) bool {
		ti, errI := time.Parse(time.RFC3339, emails[i].SendDate)
		tj, errJ := time.Parse(time.RFC3339, emails[j].SendDate)
		if errI != nil || errJ != nil {
			return i < j
		}
		return ti.After(tj)
	})

	return &pb.GetAllEmailsResponse{Success: true, Message: "Emails retrieved successfully", Emails: emails, TotalCount: totalCount}, nil
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
