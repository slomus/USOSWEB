package main

import (
	"context"
	"net/http"
	"strconv"

	pb "github.com/slomus/USOSWEB/src/backend/modules/common/gen/auth"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
)

func TokenCookieInterceptor(ctx context.Context, w http.ResponseWriter, resp proto.Message) error {
	switch r := resp.(type) {
	case *pb.LoginResponse:
		return handleAuthResponseFromMetadata(ctx, w, r)
	case *pb.RefreshTokenResponse:
		return handleRefreshResponseFromMetadata(ctx, w, r)
	case *pb.LogoutResponse:
		return handleLogoutResponse(ctx, w, r)
	}
	return nil
}

func handleAuthResponseFromMetadata(ctx context.Context, w http.ResponseWriter, resp *pb.LoginResponse) error {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil
	}

	accessTokens := md.Get("x-access-token")
	refreshTokens := md.Get("x-refresh-token")

	if len(accessTokens) > 0 && accessTokens[0] != "" {
		accessCookie := &http.Cookie{
			Name:     "access_token",
			Value:    accessTokens[0],
			Path:     "/",
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteStrictMode,
		}
		http.SetCookie(w, accessCookie)
	}

	if len(refreshTokens) > 0 && refreshTokens[0] != "" {
		refreshCookie := &http.Cookie{
			Name:     "refresh_token",
			Value:    refreshTokens[0],
			Path:     "/api/auth/refresh",
			MaxAge:   7 * 24 * 3600,
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteStrictMode,
		}
		http.SetCookie(w, refreshCookie)
	}

	return nil
}

func handleRefreshResponseFromMetadata(ctx context.Context, w http.ResponseWriter, resp *pb.RefreshTokenResponse) error {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil
	}

	accessTokens := md.Get("x-access-token")
	expiresInStr := md.Get("x-expires-in")

	if len(accessTokens) > 0 && accessTokens[0] != "" {
		expiresIn := 3600
		if len(expiresInStr) > 0 {
			if exp, err := strconv.Atoi(expiresInStr[0]); err == nil {
				expiresIn = exp
			}
		}

		accessCookie := &http.Cookie{
			Name:     "access_token",
			Value:    accessTokens[0],
			Path:     "/",
			MaxAge:   expiresIn,
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteStrictMode,
		}
		http.SetCookie(w, accessCookie)
	}

	return nil
}

func handleLogoutResponse(ctx context.Context, w http.ResponseWriter, resp *pb.LogoutResponse) error {
	accessCookie := &http.Cookie{
		Name:     "access_token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, accessCookie)

	refreshCookie := &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/auth/refresh",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteStrictMode,
	}
	http.SetCookie(w, refreshCookie)
	return nil
}
