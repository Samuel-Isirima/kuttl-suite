package middleware

import (
	"fmt"
	"net/http"
	"strings"
)

// CORS middleware
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			
			// Debug logging
			fmt.Printf("CORS DEBUG: Origin=%s, AllowedOrigins=%v\n", origin, allowedOrigins)
			
			// Check if origin is allowed
			allowed := isOriginAllowed(origin, allowedOrigins)
			fmt.Printf("CORS DEBUG: Origin allowed=%t\n", allowed)
			
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				fmt.Printf("CORS DEBUG: Set Access-Control-Allow-Origin to %s\n", origin)
			}
			
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Max-Age", "86400")
			
			// Handle preflight requests
			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}
			
			next.ServeHTTP(w, r)
		})
	}
}

func isOriginAllowed(origin string, allowedOrigins []string) bool {
	if len(allowedOrigins) == 0 {
		return false
	}
	
	// Check for wildcard
	for _, allowed := range allowedOrigins {
		if allowed == "*" {
			return true
		}
		if strings.EqualFold(origin, allowed) {
			return true
		}
	}
	
	return false
}