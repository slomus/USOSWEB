package main

import (
	"context"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"log"
	"net/http"
)

func allowCORS(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		h.ServeHTTP(w, r)
	})
}

func main() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	mux := runtime.NewServeMux()

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

	log.Println("Starting Gateway server on :8083")
	log.Println("Available endpoints:")
	log.Println("  POST /api/auth/login")
	log.Println("  POST /api/auth/register")
	log.Println("  POST /api/auth/refresh")
	log.Println("  GET  /api/hello")

	if err := http.ListenAndServe(":8083", allowCORS(mux)); err != nil {
		log.Fatalf("failed to start HTTP server: %v", err)
	}
}
