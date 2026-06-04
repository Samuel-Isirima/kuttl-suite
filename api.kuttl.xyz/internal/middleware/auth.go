package middleware

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"api.kuttl.xyz/internal/auth"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/pkg/response"
)

type contextKey string

const (
	UserContextKey    contextKey = "user"
	WebsiteContextKey contextKey = "website"
)

type Website struct {
	ID            string `db:"id"`
	UserID        string `db:"user_id"`
	Name          string `db:"name"`
	URL           string `db:"url"`
	HashKey       string `db:"hash_key"`
	IsActive      bool   `db:"is_active"`
	TotalRequests int    `db:"total_requests"`
}

type AuthMiddleware struct {
	jwtService  *auth.JWTService
	authService *auth.Service
	db          *sql.DB
}

func NewAuthMiddleware(jwtService *auth.JWTService, authService *auth.Service, db *sql.DB) *AuthMiddleware {
	return &AuthMiddleware{
		jwtService:  jwtService,
		authService: authService,
		db:          db,
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

// WebsiteAuth middleware for website hash key authentication (for tracking requests)
func (m *AuthMiddleware) WebsiteAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip authentication for OPTIONS requests (CORS preflight)
		if r.Method == "OPTIONS" {
			next.ServeHTTP(w, r)
			return
		}

		hashKey := extractWebsiteHashKey(r)
		if hashKey == "" {
			response.Error(w, http.StatusUnauthorized, "Missing website key")
			return
		}

		website, err := m.validateWebsiteHashKey(hashKey)
		if err != nil {
			response.Error(w, http.StatusUnauthorized, "Invalid website key")
			return
		}

		// SECURITY: Verify the request is coming from the correct domain
		if !m.verifyRequestOrigin(r, website) {
			response.Error(w, http.StatusForbidden, "Request origin does not match registered website domain")
			return
		}

		// Add website to context
		ctx := context.WithValue(r.Context(), WebsiteContextKey, website)
		
		// Increment request counter for this website
		go func() {
			_, _ = m.db.Exec("SELECT increment_website_requests($1)", hashKey)
		}()
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// OptionalWebsiteAuth middleware that allows both website auth and no auth
func (m *AuthMiddleware) OptionalWebsiteAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try website hash key first
		if hashKey := extractWebsiteHashKey(r); hashKey != "" {
			if website, err := m.validateWebsiteHashKey(hashKey); err == nil {
				// SECURITY: Verify the request is coming from the correct domain
				if m.verifyRequestOrigin(r, website) {
					ctx := context.WithValue(r.Context(), WebsiteContextKey, website)
					
					// Increment request counter for this website
					go func() {
						_, _ = m.db.Exec("SELECT increment_website_requests($1)", hashKey)
					}()
					
					next.ServeHTTP(w, r.WithContext(ctx))
					return
				}
				// If domain verification fails, fall through to other auth methods
			}
		}

		// Try JWT authentication
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

		// No authentication - continue without user or website
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

// extractWebsiteHashKey extracts the website hash key from X-Website-Key header
func extractWebsiteHashKey(r *http.Request) string {
	return r.Header.Get("X-Website-Key")
}

// GetWebsiteFromContext retrieves the website from the request context
func GetWebsiteFromContext(ctx context.Context) *Website {
	website, ok := ctx.Value(WebsiteContextKey).(*Website)
	if !ok {
		return nil
	}
	return website
}

// validateWebsiteHashKey validates a website hash key and returns website info
func (m *AuthMiddleware) validateWebsiteHashKey(hashKey string) (*Website, error) {
	var website Website
	query := `
		SELECT id, user_id, name, url, hash_key, is_active, total_requests
		FROM websites 
		WHERE hash_key = $1 AND is_active = TRUE
	`
	
	err := m.db.QueryRow(query, hashKey).Scan(
		&website.ID, &website.UserID, &website.Name, &website.URL,
		&website.HashKey, &website.IsActive, &website.TotalRequests,
	)
	
	if err != nil {
		return nil, err
	}
	
	return &website, nil
}

// verifyRequestOrigin checks if the request origin matches the registered website domain
func (m *AuthMiddleware) verifyRequestOrigin(r *http.Request, website *Website) bool {
	// Get the origin from request headers
	origin := r.Header.Get("Origin")
	referer := r.Header.Get("Referer")
	
	// For direct API requests (like curl, postman), we might not have Origin but have Referer
	requestURL := origin
	if requestURL == "" && referer != "" {
		requestURL = referer
	}
	
	// If we still don't have a request URL, reject it
	if requestURL == "" {
		fmt.Printf("DOMAIN VERIFICATION: No Origin or Referer header found\n")
		return false
	}
	
	// Parse the request URL to get the domain
	parsedRequestURL, err := url.Parse(requestURL)
	if err != nil {
		fmt.Printf("DOMAIN VERIFICATION: Failed to parse request URL %s: %v\n", requestURL, err)
		return false
	}
	
	// Parse the registered website URL to get the domain
	parsedWebsiteURL, err := url.Parse(website.URL)
	if err != nil {
		fmt.Printf("DOMAIN VERIFICATION: Failed to parse website URL %s: %v\n", website.URL, err)
		return false
	}
	
	// Extract hosts (domains)
	requestHost := strings.ToLower(parsedRequestURL.Host)
	websiteHost := strings.ToLower(parsedWebsiteURL.Host)
	
	// Remove port numbers for comparison if present
	if colonIndex := strings.Index(requestHost, ":"); colonIndex != -1 {
		requestHost = requestHost[:colonIndex]
	}
	if colonIndex := strings.Index(websiteHost, ":"); colonIndex != -1 {
		websiteHost = websiteHost[:colonIndex]
	}
	
	// Check for exact match
	if requestHost == websiteHost {
		fmt.Printf("DOMAIN VERIFICATION: ✅ PASS - Request from %s matches registered domain %s\n", requestHost, websiteHost)
		return true
	}
	
	// Check for subdomain match (e.g., www.example.com matches example.com)
	if strings.HasSuffix(requestHost, "."+websiteHost) {
		fmt.Printf("DOMAIN VERIFICATION: ✅ PASS - Request from subdomain %s matches registered domain %s\n", requestHost, websiteHost)
		return true
	}
	
	// Allow localhost for development (both registered website and request from localhost)
	if (strings.Contains(requestHost, "localhost") || strings.Contains(requestHost, "127.0.0.1")) && 
	   (strings.Contains(websiteHost, "localhost") || strings.Contains(websiteHost, "127.0.0.1")) {
		fmt.Printf("DOMAIN VERIFICATION: ✅ PASS - Development localhost match: %s <-> %s\n", requestHost, websiteHost)
		return true
	}
	
	fmt.Printf("DOMAIN VERIFICATION: ❌ FAIL - Request from %s does NOT match registered domain %s\n", requestHost, websiteHost)
	return false
}