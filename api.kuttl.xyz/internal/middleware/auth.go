package middleware

import (
	"context"
	"net/http"
	"strings"

	"api.kuttl.xyz/internal/auth"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/pkg/response"
)

type contextKey string

const (
	UserContextKey contextKey = "user"
)

type AuthMiddleware struct {
	jwtService  *auth.JWTService
	authService *auth.Service
}

func NewAuthMiddleware(jwtService *auth.JWTService, authService *auth.Service) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService:  jwtService,
		authService: authService,
	}
}

// JWTAuth middleware for JWT token authentication
func (m *AuthMiddleware) JWTAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip authentication for OPTIONS requests (CORS preflight)
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		token := extractJWTToken(r)
		if token == "" {
			response.Error(w, http.StatusUnauthorized, "Missing authorization token")
			return
		}

		claims, err := m.jwtService.ValidateToken(token)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		// Get user from database to ensure they still exist and are active
		user, err := m.authService.GetUserByID(claims.UserID)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "User not found")
			return
		}

		// Add user to context
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// APIKeyAuth middleware for API key authentication
func (m *AuthMiddleware) APIKeyAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := extractAPIToken(r)
		if token == "" {
			response.Error(w, http.StatusUnauthorized, "Missing API key")
			return
		}

		user, err := m.authService.ValidateAPIToken(token)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "Invalid API key")
			return
		}

		// Add user to context
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalAuth middleware that allows both authenticated and unauthenticated requests
func (m *AuthMiddleware) OptionalAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try JWT first
		if token := extractJWTToken(r); token != "" {
			if claims, err := m.jwtService.ValidateToken(token); err == nil {
				if user, err := m.authService.GetUserByID(claims.UserID); err == nil {
					ctx := context.WithValue(r.Context(), UserContextKey, user)
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
			}
		}

		// Try API key
		if token := extractAPIToken(r); token != "" {
			if user, err := m.authService.ValidateAPIToken(token); err == nil {
				ctx := context.WithValue(r.Context(), UserContextKey, user)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
		}

		// No authentication - continue without user
		next.ServeHTTP(w, r)
	})
}

// RequireAdmin middleware that requires admin role
func (m *AuthMiddleware) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := GetUserFromContext(r.Context())
		if user == nil {
			response.Error(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		if !user.IsAdmin() {
			response.Error(w, http.StatusForbidden, "Admin access required")
			return
		}

		next.ServeHTTP(w, r)
	})
}

// GetUserFromContext retrieves the user from the request context
func GetUserFromContext(ctx context.Context) *models.User {
	user, ok := ctx.Value(UserContextKey).(*models.User)
	if !ok {
		return nil
	}
	return user
}

// extractJWTToken extracts the JWT token from the Authorization header
func extractJWTToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}

	// Check for "Bearer <token>" format
	const bearerPrefix = "Bearer "
	if !strings.HasPrefix(authHeader, bearerPrefix) {
		return ""
	}

	return strings.TrimPrefix(authHeader, bearerPrefix)
}

// extractAPIToken extracts the API token from X-API-Key header
func extractAPIToken(r *http.Request) string {
	return r.Header.Get("X-API-Key")
}