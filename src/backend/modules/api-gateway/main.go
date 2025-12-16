package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/slomus/USOSWEB/src/backend/configs"
	calendarPb "github.com/slomus/USOSWEB/src/backend/modules/calendar/gen/calendar"
	academicPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/academic"
	applicationsPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/applications"
	authPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	coursePb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/course"
	gradesPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/grades"
	searchPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/search"
	messagingPb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

var appLog = logger.NewLogger("api-gateway")

func loggingMiddleware(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("DEBUG: loggingMiddleware got %s\n*", r.URL.Path)
		start := time.Now()

		clientIP := getClientIP(r)
		userAgent := r.Header.Get("User-Agent")

		appLog.LogInfo(fmt.Sprintf("Incoming request: %s %s from %s", r.Method, r.URL.Path, clientIP))
		appLog.LogDebug(fmt.Sprintf("Request headers: Content-Type=%s, User-Agent=%s",
			r.Header.Get("Content-Type"), userAgent))

		wrappedWriter := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		h.ServeHTTP(wrappedWriter, r)

		duration := time.Since(start).Milliseconds()
		appLog.LogInfo(fmt.Sprintf("Request completed: %s %s -> %d in %dms",
			r.Method, r.URL.Path, wrappedWriter.statusCode, duration))
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func getClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return strings.Split(forwarded, ",")[0]
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	return strings.Split(r.RemoteAddr, ":")[0]
}

func allowCORS(h http.Handler) http.Handler {
	// Parse allowed origins from config (comma-separated)
	allowedOrigins := strings.Split(configs.Envs.AllowedOrigins, ",")
	for i := range allowedOrigins {
		allowedOrigins[i] = strings.TrimSpace(allowedOrigins[i])
	}
	appLog.LogInfo(fmt.Sprintf("CORS allowed origins: %v", allowedOrigins))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			appLog.LogDebug(fmt.Sprintf("CORS request from origin: %s", origin))
		}

		// Check if origin is allowed
		allowedOrigin := allowedOrigins[0] // default to first
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				allowedOrigin = origin
				break
			}
		}

		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			appLog.LogDebug(fmt.Sprintf("CORS preflight request: %s %s", r.Method, r.URL.Path))
			w.WriteHeader(http.StatusOK)
			return
		}

		h.ServeHTTP(w, r)
	})
}

func extractTokensFromCookies(h http.Handler) http.Handler {

	appLog.LogInfo("DEBUG: Middleware initialized*")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		appLog.LogDebug(fmt.Sprintf("DEBUG: Request %s\n*", r.URL.Path))
		ctx := r.Context()

		if cookie, err := r.Cookie("access_token"); err == nil {
			appLog.LogDebug(fmt.Sprintf("Access token extracted from cookie for %s", r.URL.Path))
			md := metadata.Pairs("authorization", cookie.Value)
			ctx = metadata.NewIncomingContext(ctx, md)
		}

		if r.URL.Path == "/api/auth/refresh" {
			if cookie, err := r.Cookie("refresh_token"); err == nil {
				appLog.LogDebug("Refresh token extracted from cookie")
				md, _ := metadata.FromIncomingContext(ctx)
				if md == nil {
					md = metadata.New(nil)
				} else {
					md = md.Copy()
				}
				md.Set("refresh_token", cookie.Value)
				ctx = metadata.NewIncomingContext(ctx, md)
			} else {
				appLog.LogWarn("Refresh endpoint called but no refresh token cookie found")
			}
		}

		h.ServeHTTP(w, r.WithContext(ctx))
	})
}

func customHeaderMatcher(key string) (string, bool) {
	switch strings.ToLower(key) {
	case "x-access-token", "x-refresh-token", "x-expires-in":
		return key, true
	default:
		return runtime.DefaultHeaderMatcher(key)
	}
}

func customMetadataAnnotator(ctx context.Context, req *http.Request) metadata.MD {
	md := metadata.New(nil)

	if cookie, err := req.Cookie("access_token"); err == nil {
		md.Set("authorization", cookie.Value)
		fmt.Printf("DEBUG: Cookie extracted in annotator: %s\n", req.URL.Path)
	}

	if req.URL.Path == "/api/auth/refresh" {
		if cookie, err := req.Cookie("refresh_token"); err == nil {
			md.Set("refresh_token", cookie.Value)
		}
	}

	return md
}

func main() {
	appLog.LogInfo("Starting API Gateway*")
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	appLog.LogDebug("Configuring gRPC-Gateway multiplexer")
	mux := runtime.NewServeMux(
		runtime.WithMarshalerOption(runtime.MIMEWildcard, &runtime.JSONPb{
			MarshalOptions: protojson.MarshalOptions{
				EmitUnpopulated: true,
			},
		}),

		runtime.WithIncomingHeaderMatcher(func(key string) (string, bool) {
			if key == "Cookie" {
				return "cookie", true
			}
			return runtime.DefaultHeaderMatcher(key)
		}),
		runtime.WithOutgoingHeaderMatcher(customHeaderMatcher),
		runtime.WithMetadata(customMetadataAnnotator),
		runtime.WithForwardResponseOption(func(ctx context.Context, w http.ResponseWriter, resp proto.Message) error {
			if md, ok := runtime.ServerMetadataFromContext(ctx); ok {
				if headerMD := md.HeaderMD; headerMD != nil {
					newCtx := metadata.NewIncomingContext(ctx, headerMD)
					return TokenCookieInterceptor(newCtx, w, resp)
				}
			}
			return TokenCookieInterceptor(ctx, w, resp)
		}),
	)
	opts := []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())}
	appLog.LogInfo("Registering microservices via service discovery")
	appLog.LogInfo("Registering AuthService endpoints")
	commonServiceEndpoint := configs.Envs.GetCommonEndpoint()
	appLog.LogDebug(fmt.Sprintf("Connecting to AuthService at: %s", commonServiceEndpoint))
	err := authPb.RegisterAuthServiceHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register AuthService gateway", err)
		panic(err)
	}
	appLog.LogInfo("AuthService endpoints registered successfully")
	appLog.LogInfo("Registering AuthHello endpoints")
	err = authPb.RegisterAuthHelloHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register AuthHello gateway", err)
		panic(err)
	}
	appLog.LogInfo("AuthHello endpoints registered successfully")
	err = coursePb.RegisterCourseServiceHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register CourseService gateway", err)
		panic(err)
	}
	appLog.LogInfo("CourseService endpoints registered successfully")

	// Grades Service
	appLog.LogInfo("Registering GradesService endpoints")
	gradesServiceEndpoint := configs.Envs.GetCommonEndpoint()
	appLog.LogDebug(fmt.Sprintf("Connecting to GradesService at: %s", gradesServiceEndpoint))
	err = gradesPb.RegisterGradesServiceHandlerFromEndpoint(ctx, mux, gradesServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register GradesService gateway", err)
		panic(err)
	}
	appLog.LogInfo("GradesService endpoints registered successfully")

	// Calendar Service
	appLog.LogInfo("Registering CalendarService endpoints")
	calendarServiceEndpoint := configs.Envs.GetCalendarEndpoint()
	appLog.LogDebug(fmt.Sprintf("Connecting to CalendarService at: %s", calendarServiceEndpoint))
	err = calendarPb.RegisterCalendarServiceHandlerFromEndpoint(ctx, mux, calendarServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register CalendarService gateway", err)
		panic(err)
	}
	appLog.LogInfo("CalendarService endpoints registered successfully")

	// Messaging Service
	appLog.LogInfo("Registering MessagingService endpoints")
	messagingEndpoint := configs.Envs.GetMessagingEndpoint()
	appLog.LogDebug(fmt.Sprintf("Connecting to MessagingService at: %s", messagingEndpoint))
	err = messagingPb.RegisterMessagingServiceHandlerFromEndpoint(ctx, mux, messagingEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register MessagingService gateway", err)
		panic(err)
	}
	appLog.LogInfo("MessagingService endpoints registered successfully")

	// Applications Service
	appLog.LogInfo("Registering ApplicationsService endpoints")
	commonEndpoint := configs.Envs.GetCommonEndpoint()
	err = applicationsPb.RegisterApplicationsServiceHandlerFromEndpoint(ctx, mux, commonEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register ApplicationsService gateway", err)
		panic(err)
	}
	appLog.LogInfo("ApplicationsService endpoints registered successfully")

	//Course Service
	appLog.LogInfo("Registering cou endpoints")

	// Subjects Service
	appLog.LogInfo("Registering SubjectsService endpoints")
	err = academicPb.RegisterSubjectsServiceHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register SubjectsService gateway", err)
		panic(err)
	}
	appLog.LogInfo("SubjectsService endpoints registered successfully")

	// Enrollments Service
	appLog.LogInfo("Registering EnrollmentsService endpoints")
	err = academicPb.RegisterEnrollmentsServiceHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register EnrollmentsService gateway", err)
		panic(err)
	}
	appLog.LogInfo("EnrollmentsService endpoints registered successfully")

	// Search Service
	appLog.LogInfo("Registering SearchService endpoints")
	err = searchPb.RegisterSearchServiceHandlerFromEndpoint(ctx, mux, commonServiceEndpoint, opts)
	if err != nil {
		appLog.LogError("Failed to register SearchService gateway", err)
		panic(err)
	}
	appLog.LogInfo("SearchService endpoints registered successfully")

	photoHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" && strings.HasPrefix(r.URL.Path, "/api/users/") && strings.HasSuffix(r.URL.Path, "/photo") {
			handleProfilePhoto(w, r, commonServiceEndpoint, opts)
			return
		}
		mux.ServeHTTP(w, r)
	})

	handler := loggingMiddleware(allowCORS(photoHandler))

	appLog.LogInfo("API Gateway configured with endpoints:")
	endpoints := []string{
		"GET  /health",
		"GET  /ready",
		"POST /api/auth/login",
		"POST /api/auth/register",
		"POST /api/auth/refresh",
		"POST /api/auth/logout",
		"GET  /api/auth/username",
		"GET  /api/hello",
		"GET  /api/courses",
		"GET  /api/courses/{id}",
		"GET  /api/courses/{id}/subjects",
		"GET  /api/courses/search",
		"GET  /api/courses/stats",
		"GET  /api/faculties",
		"GET  /api/student/course-info/{album_nr}",
		"GET  /api/calendar/academic",
		"GET  /api/calendar/semester/current",
		"GET  /api/calendar/holidays",
		"POST /api/calendar/academic",
		"GET  /api/calendar/user/{user_id}/events",
		"POST /api/calendar/events",
		"GET  /api/calendar/class/{class_id}/schedule",
		"POST /api/messaging/send-email",
		"POST /api/messaging/get_email",
		"POST /api/messaging/get_all_emails",
		"POST /api/messaging/delete_email",
		"POST /api/messaging/set_email_read",
		"POST /api/messaging/set_email_unread",
		"GET  /api/messaging/suggest-email",
		"GET  /api/applications",
		"POST /api/applications",
		"GET  /api/grades",
		"POST /api/grades",
		"GET  /api/subjects",
		"GET  /api/subjects/{id}",
		"POST /api/enrollments",
		"DELETE /api/enrollments/{subject_id}",
		"GET  /api/enrollments",
		"POST /api/enrollments/check-conflicts",
		"GET /api/search",
	}
	for _, endpoint := range endpoints {
		appLog.LogInfo(fmt.Sprintf("  %s", endpoint))
	}
	port := ":8083"
	appLog.LogInfo(fmt.Sprintf("Starting HTTP server on port %s", port))
	appLog.LogInfo("Gateway ready to handle requests")
	if err := http.ListenAndServe(port, handler); err != nil {
		appLog.LogError("Failed to start HTTP server", err)
		panic(err)
	}
}

func handleProfilePhoto(w http.ResponseWriter, r *http.Request, endpoint string, opts []grpc.DialOption) {
	appLog.LogInfo(fmt.Sprintf("Custom photo handler called for: %s", r.URL.Path))

	parts := strings.Split(r.URL.Path, "/")
	appLog.LogInfo(fmt.Sprintf("Path parts: %v", parts))
	if len(parts) < 4 {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}

	userID := parts[3]
	var userIDInt int32
	fmt.Sscanf(userID, "%d", &userIDInt)

	ctx := r.Context()
	if cookie, err := r.Cookie("access_token"); err == nil {
		md := metadata.Pairs("authorization", cookie.Value)
		ctx = metadata.NewOutgoingContext(ctx, md)
	}

	conn, err := grpc.NewClient(endpoint, opts...)
	if err != nil {
		http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
		return
	}
	defer conn.Close()

	client := authPb.NewAuthServiceClient(conn)
	resp, err := client.GetProfilePhoto(ctx, &authPb.GetProfilePhotoRequest{UserId: userIDInt})

	if err != nil {
		appLog.LogError("GetProfilePhoto failed", err) // ← dodaj log błędu
		http.Error(w, "Photo not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", resp.MimeType)
	w.Write(resp.PhotoData)
}
