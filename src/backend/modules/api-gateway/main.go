package main

import (
    "context"
    "log"
    "net/http"
    "github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
    "google.golang.org/grpc"
    pb "usosweb/src/backend/modules/common/gen/auth" 
)

func main() {
    ctx := context.Background()
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()

    mux := runtime.NewServeMux()

    opts := []grpc.DialOption{grpc.WithInsecure()} 
		err := pb.RegisterAuthHelloHandlerFromEndpoint(ctx, mux, "common:3004", opts)
    if err != nil {
        log.Fatalf("failed to register gateway: %v", err)
    }

    log.Println("Starting Gateway server on :8080")
    if err := http.ListenAndServe(":8080", mux); err != nil {
        log.Fatalf("failed to start HTTP server: %v", err)
    }
}
