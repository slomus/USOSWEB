package validation

import (
	"fmt"
	"net/mail"
	"regexp"
	"strings"
	"unicode"
)

// ValidationError represents a validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// ValidationErrors represents multiple validation errors
type ValidationErrors []ValidationError

func (ve ValidationErrors) Error() string {
	if len(ve) == 0 {
		return ""
	}

	var messages []string
	for _, err := range ve {
		messages = append(messages, err.Error())
	}
	return strings.Join(messages, "; ")
}

// ValidateEmail validates email format
func ValidateEmail(email string) *ValidationError {
	if email == "" {
		return &ValidationError{Field: "email", Message: "email is required"}
	}

	if len(email) > 254 {
		return &ValidationError{Field: "email", Message: "email is too long (max 254 characters)"}
	}

	_, err := mail.ParseAddress(email)
	if err != nil {
		return &ValidationError{Field: "email", Message: "invalid email format"}
	}

	return nil
}

// ValidatePassword validates password strength
func ValidatePassword(password string) *ValidationError {
	if password == "" {
		return &ValidationError{Field: "password", Message: "password is required"}
	}

	if len(password) < 8 {
		return &ValidationError{Field: "password", Message: "password must be at least 8 characters long"}
	}

	if len(password) > 128 {
		return &ValidationError{Field: "password", Message: "password is too long (max 128 characters)"}
	}

	// Check for at least one uppercase letter
	hasUpper := false
	// Check for at least one lowercase letter
	hasLower := false
	// Check for at least one digit
	hasDigit := false
	// Check for at least one special character
	hasSpecial := false

	for _, char := range password {
		if unicode.IsUpper(char) {
			hasUpper = true
		} else if unicode.IsLower(char) {
			hasLower = true
		} else if unicode.IsDigit(char) {
			hasDigit = true
		} else if unicode.IsPunct(char) || unicode.IsSymbol(char) {
			hasSpecial = true
		}
	}

	if !hasUpper {
		return &ValidationError{Field: "password", Message: "password must contain at least one uppercase letter"}
	}
	if !hasLower {
		return &ValidationError{Field: "password", Message: "password must contain at least one lowercase letter"}
	}
	if !hasDigit {
		return &ValidationError{Field: "password", Message: "password must contain at least one digit"}
	}
	if !hasSpecial {
		return &ValidationError{Field: "password", Message: "password must contain at least one special character"}
	}

	return nil
}

// ValidateResetToken validates password reset token format
func ValidateResetToken(token string) *ValidationError {
	if token == "" {
		return &ValidationError{Field: "token", Message: "reset token is required"}
	}

	// Token should be 64 hex characters (32 bytes in hex)
	if len(token) != 64 {
		return &ValidationError{Field: "token", Message: "invalid token format"}
	}

	// Check if token contains only hex characters
	matched, _ := regexp.MatchString("^[a-fA-F0-9]+$", token)
	if !matched {
		return &ValidationError{Field: "token", Message: "invalid token format"}
	}

	return nil
}

// ValidateLoginRequest validates login request data
func ValidateLoginRequest(email, password string) ValidationErrors {
	var errors ValidationErrors

	if err := ValidateEmail(email); err != nil {
		errors = append(errors, *err)
	}

	if password == "" {
		errors = append(errors, ValidationError{Field: "password", Message: "password is required"})
	}

	return errors
}

// ValidateRegisterRequest validates registration request data
func ValidateRegisterRequest(email, password string) ValidationErrors {
	var errors ValidationErrors

	if err := ValidateEmail(email); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidatePassword(password); err != nil {
		errors = append(errors, *err)
	}

	return errors
}

// ValidateForgotPasswordRequest validates forgot password request
func ValidateForgotPasswordRequest(email string) ValidationErrors {
	var errors ValidationErrors

	if err := ValidateEmail(email); err != nil {
		errors = append(errors, *err)
	}

	return errors
}

// ValidateResetPasswordRequest validates reset password request
func ValidateResetPasswordRequest(token, newPassword string) ValidationErrors {
	var errors ValidationErrors

	if err := ValidateResetToken(token); err != nil {
		errors = append(errors, *err)
	}

	if err := ValidatePassword(newPassword); err != nil {
		errors = append(errors, *err)
	}

	return errors
}
