package errors

import (
	"fmt"
	"net/http"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AppError represents a custom application error
type AppError struct {
	Code       int    `json:"code"`
	Message    string `json:"message"`
	Details    string `json:"details,omitempty"`
	GRPCCode   codes.Code
	HTTPStatus int
}

func (e *AppError) Error() string {
	if e.Details != "" {
		return fmt.Sprintf("%s: %s", e.Message, e.Details)
	}
	return e.Message
}

// ToGRPCError converts AppError to gRPC status error
func (e *AppError) ToGRPCError() error {
	return status.Error(e.GRPCCode, e.Message)
}

// Common error types
var (
	// Authentication errors
	ErrInvalidCredentials = &AppError{
		Code:       1001,
		Message:    "Invalid credentials",
		GRPCCode:   codes.Unauthenticated,
		HTTPStatus: http.StatusUnauthorized,
	}

	ErrTokenExpired = &AppError{
		Code:       1002,
		Message:    "Token has expired",
		GRPCCode:   codes.Unauthenticated,
		HTTPStatus: http.StatusUnauthorized,
	}

	ErrTokenInvalid = &AppError{
		Code:       1003,
		Message:    "Invalid token",
		GRPCCode:   codes.Unauthenticated,
		HTTPStatus: http.StatusUnauthorized,
	}

	ErrTokenBlacklisted = &AppError{
		Code:       1004,
		Message:    "Token has been invalidated",
		GRPCCode:   codes.Unauthenticated,
		HTTPStatus: http.StatusUnauthorized,
	}

	// Validation errors
	ErrValidationFailed = &AppError{
		Code:       2001,
		Message:    "Validation failed",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}

	ErrInvalidEmail = &AppError{
		Code:       2002,
		Message:    "Invalid email format",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}

	ErrWeakPassword = &AppError{
		Code:       2003,
		Message:    "Password does not meet security requirements",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}

	// Database errors
	ErrUserNotFound = &AppError{
		Code:       3001,
		Message:    "User not found",
		GRPCCode:   codes.NotFound,
		HTTPStatus: http.StatusNotFound,
	}

	ErrUserAlreadyExists = &AppError{
		Code:       3002,
		Message:    "User already exists",
		GRPCCode:   codes.AlreadyExists,
		HTTPStatus: http.StatusConflict,
	}

	ErrDatabaseConnection = &AppError{
		Code:       3003,
		Message:    "Database connection failed",
		GRPCCode:   codes.Internal,
		HTTPStatus: http.StatusInternalServerError,
	}

	ErrDatabaseQuery = &AppError{
		Code:       3004,
		Message:    "Database query failed",
		GRPCCode:   codes.Internal,
		HTTPStatus: http.StatusInternalServerError,
	}

	// Server errors
	ErrInternalServer = &AppError{
		Code:       5001,
		Message:    "Internal server error",
		GRPCCode:   codes.Internal,
		HTTPStatus: http.StatusInternalServerError,
	}

	ErrServiceUnavailable = &AppError{
		Code:       5002,
		Message:    "Service temporarily unavailable",
		GRPCCode:   codes.Unavailable,
		HTTPStatus: http.StatusServiceUnavailable,
	}

	// Password reset errors
	ErrResetTokenInvalid = &AppError{
		Code:       4001,
		Message:    "Invalid or expired reset token",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}

	ErrResetTokenUsed = &AppError{
		Code:       4002,
		Message:    "Reset token has already been used",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}

	ErrResetTokenExpired = &AppError{
		Code:       4003,
		Message:    "Reset token has expired",
		GRPCCode:   codes.InvalidArgument,
		HTTPStatus: http.StatusBadRequest,
	}
)

// NewAppError creates a new AppError with details
func NewAppError(baseError *AppError, details string) *AppError {
	return &AppError{
		Code:       baseError.Code,
		Message:    baseError.Message,
		Details:    details,
		GRPCCode:   baseError.GRPCCode,
		HTTPStatus: baseError.HTTPStatus,
	}
}

// NewValidationError creates a validation error with details
func NewValidationError(details string) *AppError {
	return NewAppError(ErrValidationFailed, details)
}

// NewDatabaseError creates a database error with details
func NewDatabaseError(details string) *AppError {
	return NewAppError(ErrDatabaseQuery, details)
}

// WrapError wraps a standard error into an AppError
func WrapError(err error, appErr *AppError) *AppError {
	return NewAppError(appErr, err.Error())
}
