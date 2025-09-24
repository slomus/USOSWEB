package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"github.com/slomus/USOSWEB/src/backend/configs"
	applicationsPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/applications"
	authPb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	coursePb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/course"
	messagingPb "github.com/slomus/USOSWEB/src/backend/modules/messaging/gen/messaging"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
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
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			appLog.LogDebug(fmt.Sprintf("CORS request from origin: %s", origin))
		}

		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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

	// Register services using service discovery
	appLog.LogInfo("Registering microservices via service discovery")

	// Common/Auth Service
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

	handler := loggingMiddleware(allowCORS(mux))

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
		"POST /api/messaging/send-email",
		"GET  /api/messaging/suggest-email",
		"GET  /api/applications",
		"POST /api/applications",
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
