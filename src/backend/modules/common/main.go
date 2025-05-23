package main

import (
    "context"
    "log"
    "net"

    pb "github.com/slomus/USOSWEB/src/backend/common/gen/auth"
    "google.golang.org/grpc"
)

type server struct {
    pb.UnimplementedAuthHelloServer
}

func (s server) SayHello(ctx context.Context, reqpb.HelloRequest) (*pb.HelloResponse, error) {
    return &pb.HelloResponse{Message: "Hello from Common!"}, nil
}

func main() {
    lis, err := net.Listen("tcp", ":3004")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }

    s := grpc.NewServer()
    pb.RegisterAuthHelloServer(s, &server{})

    log.Println("Backend gRPC server is running on port :3004")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
