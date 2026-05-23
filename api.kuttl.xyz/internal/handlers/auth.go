package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

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

	response.Created(w, map[string]interface{}{
		"user": user,
		"message": "User created successfully. Please verify your email.",
	})
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

	authResp, err := h.authService.Login(&req)
	if err != nil {
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