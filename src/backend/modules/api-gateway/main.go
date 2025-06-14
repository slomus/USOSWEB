package main

import (
	"context"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
	"log"
	"net/http"
	"strings"
)

func allowCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func extractTokensFromCookies(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()

		if cookie, err := r.Cookie("access_token"); err == nil {
			md := metadata.Pairs("authorization", cookie.Value)
			ctx = metadata.NewIncomingContext(ctx, md)
		}

		if r.URL.Path == "/api/auth/refresh" {
			if cookie, err := r.Cookie("refresh_token"); err == nil {
				md, _ := metadata.FromIncomingContext(ctx)
				if md == nil {
					md = metadata.New(nil)
				} else {
					md = md.Copy()
				}
				md.Set("refresh_token", cookie.Value)
				ctx = metadata.NewIncomingContext(ctx, md)
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
	return metadata.New(nil)
}

func main() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux(
		runtime.WithIncomingHeaderMatcher(customHeaderMatcher),
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

	err := pb.RegisterAuthServiceHandlerFromEndpoint(ctx, mux, "common:3003", opts)
	if err != nil {
		log.Fatalf("failed to register AuthService gateway: %v", err)
	}
	log.Println("Registered AuthService endpoints")

	err = pb.RegisterAuthHelloHandlerFromEndpoint(ctx, mux, "common:3003", opts)
	if err != nil {
		log.Fatalf("failed to register AuthHello gateway: %v", err)
	}
	log.Println("Registered AuthHello endpoints")

	handler := allowCORS(extractTokensFromCookies(mux))

	log.Println("Starting Gateway server on :8083")
	log.Println("Available endpoints:")
	log.Println("  POST /api/auth/login")
	log.Println("  POST /api/auth/register")
	log.Println("  POST /api/auth/refresh")
	log.Println("  POST /api/auth/logout")
	log.Println("  GET  /api/hello")
	log.Println("")

	if err := http.ListenAndServe(":8083", handler); err != nil {
		log.Fatalf("failed to start HTTP server: %v", err)
	}
}
