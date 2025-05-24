package middleware

import (
	"context"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func AuthInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {

	if info.FullMethod == "/modules.common.api.AuthService/Login" ||
		info.FullMethod == "/modules.common.api.AuthService/Register" {
		return handler(ctx, req)
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "missing credentials")
	}

	tokens := md.Get("authorization")
	if len(tokens) == 0 {
		return nil, status.Error(codes.Unauthenticated, "authorization token required")
	}

	claims, err := auth.ValidateToken(tokens[0])
	if err != nil {
		return nil, status.Error(codes.Unauthenticated, "invalid token")
	}

	newCtx := context.WithValue(ctx, "user_id", claims.UserID)
	return handler(newCtx, req)

}
