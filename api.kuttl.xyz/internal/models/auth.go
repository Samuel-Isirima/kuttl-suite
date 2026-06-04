package models

import "github.com/google/uuid"

// LoginRequest represents user login credentials
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// RegisterRequest represents user registration data
type RegisterRequest struct {
	Name     string `json:"name" validate:"required,min=2,max=100"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// AuthResponse represents the response after successful authentication
type AuthResponse struct {
	User  *User  `json:"user"`
	Token string `json:"token"`
}

// ProfileUpdateRequest represents a profile update request
type ProfileUpdateRequest struct {
	Name  string `json:"name" validate:"required,min=2,max=100"`
	Email string `json:"email" validate:"required,email"`
}

// PasswordChangeRequest represents a password change request
type PasswordChangeRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// ForgotPasswordRequest represents a forgot password request
type ForgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordRequest represents a password reset request
type ResetPasswordRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// PasswordResetToken stores password reset tokens
type PasswordResetToken struct {
	ID     uuid.UUID `json:"id" db:"id"`
	UserID uuid.UUID `json:"user_id" db:"user_id"`
	Token  string    `json:"token" db:"token_hash"`
	Used   bool      `json:"used" db:"used"`
	ExpiresAt string `json:"expires_at" db:"expires_at"`
	CreatedAt string `json:"created_at" db:"created_at"`
}

// EmailVerificationToken stores email verification tokens
type EmailVerificationToken struct {
	ID     uuid.UUID `json:"id" db:"id"`
	UserID uuid.UUID `json:"user_id" db:"user_id"`
	Token  string    `json:"token" db:"token_hash"`
	Used   bool      `json:"used" db:"used"`
	ExpiresAt string `json:"expires_at" db:"expires_at"`
	CreatedAt string `json:"created_at" db:"created_at"`
}