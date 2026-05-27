package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"api.kuttl.xyz/internal/auth"
	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/pkg/response"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

type AuthHandler struct {
	authService *auth.Service
}

func NewAuthHandler(authService *auth.Service) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register handles user registration
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	// Basic validation
	if req.Email == "" || req.Password == "" || req.Name == "" {
		response.BadRequest(w, "Email, password, and name are required")
		return
	}

	if len(req.Password) < 8 {
		response.BadRequest(w, "Password must be at least 8 characters long")
		return
	}

	user, err := h.authService.Register(&req)
	if err != nil {
		if err.Error() == fmt.Sprintf("user with email %s already exists", req.Email) {
			response.BadRequest(w, "User with this email already exists")
			return
		}
		response.InternalError(w, "Failed to create user")
		return
	}

	// Create email verification token
	token, err := h.authService.CreateEmailVerificationToken(user.ID)
	if err != nil {
		// Log error but don't fail registration
		fmt.Printf("Failed to create email verification token: %v\n", err)
	}

	// TODO: Send email with verification token
	// For development, we'll just log it
	if token != "" {
		fmt.Printf("Email verification token for %s: %s\n", user.Email, token)
		fmt.Printf("Verify at: http://localhost:8080/auth/verify-email?token=%s\n", token)
	}

	response.Created(w, map[string]interface{}{
		"user": user,
		"message": "User created successfully. Please check your email for verification instructions.",
	})
}

// getClientIP extracts the real client IP from request headers
func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (most common for proxies/load balancers)
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if idx := strings.Index(xff, ","); idx != -1 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	
	// Check X-Real-IP header (nginx)
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}
	
	// Check CF-Connecting-IP header (Cloudflare)
	if cfip := r.Header.Get("CF-Connecting-IP"); cfip != "" {
		return strings.TrimSpace(cfip)
	}
	
	// Fallback to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// Login handles user authentication
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		response.BadRequest(w, "Email and password are required")
		return
	}

	// Get client IP and user agent
	clientIP := getClientIP(r)
	userAgent := r.Header.Get("User-Agent")

	authResp, err := h.authService.LoginWithContext(&req, clientIP, userAgent)
	if err != nil {
		fmt.Printf("Login error for %s: %v\n", req.Email, err)
		if err.Error() == "invalid email or password" {
			response.Unauthorized(w, "Invalid email or password")
			return
		}
		response.InternalError(w, "Failed to authenticate user")
		return
	}

	response.Success(w, authResp)
}

// GetProfile returns the current user's profile
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	response.Success(w, user)
}

// CreateAPIToken creates a new API token for the authenticated user
func (h *AuthHandler) CreateAPIToken(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req models.APITokenCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Name == "" {
		response.BadRequest(w, "Token name is required")
		return
	}

	// Validate expiration date if provided
	if req.ExpiresAt != nil {
		now := time.Now()
		if req.ExpiresAt.Before(now) || req.ExpiresAt.Equal(now) {
			response.BadRequest(w, "Expiration date must be in the future")
			return
		}
	}

	token, err := h.authService.CreateAPIToken(user.ID, &req)
	if err != nil {
		response.InternalError(w, "Failed to create API token")
		return
	}

	response.Created(w, token)
}

// ListAPITokens returns all API tokens for the authenticated user
func (h *AuthHandler) ListAPITokens(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	tokens, err := h.authService.GetUserAPITokens(user.ID)
	if err != nil {
		response.InternalError(w, "Failed to get API tokens")
		return
	}

	response.Success(w, tokens)
}

// RevokeAPIToken revokes an API token
func (h *AuthHandler) RevokeAPIToken(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	vars := mux.Vars(r)
	tokenIDStr := vars["tokenId"]
	
	tokenID, err := uuid.Parse(tokenIDStr)
	if err != nil {
		response.BadRequest(w, "Invalid token ID")
		return
	}

	err = h.authService.RevokeAPIToken(user.ID, tokenID)
	if err != nil {
		if err.Error() == "API token not found" {
			response.NotFound(w, "API token not found")
			return
		}
		response.InternalError(w, "Failed to revoke API token")
		return
	}

	response.Success(w, map[string]string{
		"message": "API token revoked successfully",
	})
}

// VerifyEmail handles email verification
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		response.BadRequest(w, "Verification token is required")
		return
	}

	err := h.authService.VerifyEmail(token)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.Success(w, map[string]string{
		"message": "Email verified successfully",
	})
}

// ResendVerification resends email verification
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email" validate:"required,email"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Email == "" {
		response.BadRequest(w, "Email is required")
		return
	}

	user, token, err := h.authService.ResendEmailVerification(req.Email)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	// TODO: Send email with verification token
	// For development, we'll just log it
	fmt.Printf("Email verification token for %s: %s\n", user.Email, token)
	fmt.Printf("Verify at: http://localhost:8080/auth/verify-email?token=%s\n", token)

	response.Success(w, map[string]string{
		"message": "Verification email sent successfully",
	})
}

// ForgotPassword handles password reset requests
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req models.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Email == "" {
		response.BadRequest(w, "Email is required")
		return
	}

	user, token, err := h.authService.CreatePasswordResetToken(req.Email)
	if err != nil {
		// For security, return success even if user not found
		response.Success(w, map[string]string{
			"message": "If an account with that email exists, a password reset link has been sent",
		})
		return
	}

	// TODO: Send email with reset token
	// For development, we'll just log it
	fmt.Printf("Password reset token for %s: %s\n", user.Email, token)
	fmt.Printf("Reset at: http://localhost:8080/auth/reset-password?token=%s\n", token)

	response.Success(w, map[string]string{
		"message": "If an account with that email exists, a password reset link has been sent",
	})
}

// ResetPassword handles password resets
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req models.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		response.BadRequest(w, "Token and new password are required")
		return
	}

	if len(req.NewPassword) < 8 {
		response.BadRequest(w, "Password must be at least 8 characters long")
		return
	}

	err := h.authService.ResetPassword(req.Token, req.NewPassword)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.Success(w, map[string]string{
		"message": "Password reset successfully",
	})
}

// ChangePassword handles password changes for authenticated users
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var req models.PasswordChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		response.BadRequest(w, "Current password and new password are required")
		return
	}

	if len(req.NewPassword) < 8 {
		response.BadRequest(w, "Password must be at least 8 characters long")
		return
	}

	err := h.authService.ChangePassword(user.ID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		response.BadRequest(w, err.Error())
		return
	}

	response.Success(w, map[string]string{
		"message": "Password changed successfully",
	})
}