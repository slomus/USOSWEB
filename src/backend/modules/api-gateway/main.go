package main

import (
    "context"
    "log"
    "net/http"

    "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "google.golang.org/grpc"
    pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
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

    opts := []grpc.DialOption{grpc.WithInsecure()}

    err := pb.RegisterAuthHelloHandlerFromEndpoint(ctx, mux, "common:3003", opts)
    if err != nil {
        log.Fatalf("failed to register gateway: %v", err)
    }

    log.Println("Starting Gateway server on :8083")
    if err := http.ListenAndServe(":8083", allowCORS(mux)); err != nil {
        log.Fatalf("failed to start HTTP server: %v", err)
    }
}
