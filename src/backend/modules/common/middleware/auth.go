package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"github.com/slomus/USOSWEB/src/backend/pkg/logger"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"time"
)

var log = logger.NewLogger("auth-middleware")

func AuthInterceptorWithDB(db *sql.DB) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		start := time.Now()

		log.LogDebug(fmt.Sprintf("Processing request: %s", info.FullMethod))

		if info.FullMethod == "/modules.common.api.AuthService/Login" ||
			info.FullMethod == "/modules.common.api.AuthService/Register" ||
			info.FullMethod == "/modules.common.api.AuthService/Logout" ||
			info.FullMethod == "/modules.common.api.AuthService/ForgotPassword" ||
			info.FullMethod == "/modules.common.api.AuthService/ResetPassword" {

			log.LogDebug(fmt.Sprintf("Skipping auth for public endpoint: %s", info.FullMethod))
			return handler(ctx, req)
		}

		md, ok := metadata.FromIncomingContext(ctx)
		if !ok {
			log.LogWarn("Request without metadata - rejecting")
			return nil, status.Error(codes.Unauthenticated, "missing credentials")
		}

		var token string
		var tokenType string

		if info.FullMethod == "/modules.common.api.AuthService/RefreshToken" {
			refreshTokens := md.Get("refresh_token")
			if len(refreshTokens) == 0 || refreshTokens[0] == "" {
				log.LogError("Missing refresh token in refresh request", nil)
				return nil, status.Error(codes.Unauthenticated, "refresh token required")
			}
			token = refreshTokens[0]
			tokenType = "refresh"
		} else {
			tokens := md.Get("authorization")
			if len(tokens) == 0 || tokens[0] == "" {
				log.LogError("Missing access token in request", nil)
				return nil, status.Error(codes.Unauthenticated, "access token required")
			}
			token = tokens[0]
			tokenType = "access"
		}

		var isBlacklisted bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM token_blacklist WHERE token = $1)", token).Scan(&isBlacklisted)
		if err != nil {
			log.LogError(fmt.Sprintf("Database error during blacklist check for %s token", tokenType), err)
		} else if isBlacklisted {
			log.LogWarn(fmt.Sprintf("Attempt to use blacklisted %s token", tokenType))
			return nil, status.Error(codes.Unauthenticated, "token has been invalidated")
		}

		claims, err := auth.ValidateToken(token)
		if err != nil {
			log.LogError(fmt.Sprintf("Validation of %s token failed", tokenType), err)
			return nil, status.Error(codes.Unauthenticated, "invalid token")
		}

		newCtx := context.WithValue(ctx, "user_id", claims.UserID)

		md.Set("user_id", fmt.Sprintf("%d", claims.UserID))
		newCtx = metadata.NewIncomingContext(newCtx, md)

		duration := time.Since(start).Milliseconds()
		log.LogInfo(fmt.Sprintf("User %d authorization successful in %dms", claims.UserID, duration))

		return handler(newCtx, req)
	}
}
