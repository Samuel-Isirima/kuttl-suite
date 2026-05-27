package middleware

import (
	"context"
	"net/http"

	"api.kuttl.xyz/internal/fingerprint"
)

type fingerprintKeyType string

const FingerprintKey fingerprintKeyType = "browser_fingerprint"

// FingerprintMiddleware extracts browser fingerprint and adds it to context
func FingerprintMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fp := fingerprint.ExtractFromHeader(r)
		ctx := context.WithValue(r.Context(), FingerprintKey, fp)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetFingerprintFromContext extracts fingerprint from request context
func GetFingerprintFromContext(ctx context.Context) string {
	if fp, ok := ctx.Value(FingerprintKey).(string); ok {
		return fp
	}
	return ""
}