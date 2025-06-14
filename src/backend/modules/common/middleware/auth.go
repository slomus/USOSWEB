package middleware

import (
	"context"
	"database/sql"
	"log"

	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func AuthInterceptorWithDB(db *sql.DB) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {

		if info.FullMethod == "/modules.common.api.AuthService/Login" ||
			info.FullMethod == "/modules.common.api.AuthService/Register" ||
			info.FullMethod == "/modules.common.api.AuthService/Logout" {
			return handler(ctx, req)
		}

		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			return nil, status.Error(codes.Unauthenticated, "missing credentials")
		}

		var token string

		if info.FullMethod == "/modules.common.api.AuthService/RefreshToken" {
			refreshTokens := md.Get("refresh_token")
			if len(refreshTokens) == 0 || refreshTokens[0] == "" {
				return nil, status.Error(codes.Unauthenticated, "refresh token required")
			}
			token = refreshTokens[0]
		} else {
			tokens := md.Get("authorization")
			if len(tokens) == 0 || tokens[0] == "" {
				return nil, status.Error(codes.Unauthenticated, "access token required")
			}
			token = tokens[0]
		}

		var isBlacklisted bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM token_blacklist WHERE token = $1)", token).Scan(&isBlacklisted)
		if err != nil {
			log.Printf("Blacklist check error: %v", err)
		} else if isBlacklisted {
			return nil, status.Error(codes.Unauthenticated, "token has been invalidated")
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}

		newCtx := context.WithValue(ctx, "user_id", claims.UserID)
		return handler(newCtx, req)
	}
}
