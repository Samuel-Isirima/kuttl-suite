package fingerprint

import (
	"crypto/md5"
	"fmt"
	"net/http"
	"sort"
	"strings"
)

// Generate creates a browser fingerprint from request headers and other data
func Generate(r *http.Request) string {
	var components []string

	// Add User-Agent
	if ua := r.Header.Get("User-Agent"); ua != "" {
		components = append(components, "ua:"+ua)
	}

	// Add Accept headers
	if accept := r.Header.Get("Accept"); accept != "" {
		components = append(components, "accept:"+accept)
	}

	if acceptLang := r.Header.Get("Accept-Language"); acceptLang != "" {
		components = append(components, "accept-lang:"+acceptLang)
	}

	if acceptEncoding := r.Header.Get("Accept-Encoding"); acceptEncoding != "" {
		components = append(components, "accept-enc:"+acceptEncoding)
	}

	// Add other fingerprinting headers
	if dnt := r.Header.Get("DNT"); dnt != "" {
		components = append(components, "dnt:"+dnt)
	}

	if secFetchDest := r.Header.Get("Sec-Fetch-Dest"); secFetchDest != "" {
		components = append(components, "sec-fetch-dest:"+secFetchDest)
	}

	if secFetchMode := r.Header.Get("Sec-Fetch-Mode"); secFetchMode != "" {
		components = append(components, "sec-fetch-mode:"+secFetchMode)
	}

	if secFetchSite := r.Header.Get("Sec-Fetch-Site"); secFetchSite != "" {
		components = append(components, "sec-fetch-site:"+secFetchSite)
	}

	// Add custom fingerprint header if provided by client
	if customFingerprint := r.Header.Get("X-Browser-Fingerprint"); customFingerprint != "" {
		components = append(components, "custom:"+customFingerprint)
	}

	// Get screen info from custom header if provided
	if screenInfo := r.Header.Get("X-Screen-Info"); screenInfo != "" {
		components = append(components, "screen:"+screenInfo)
	}

	// Get timezone info if provided
	if timezone := r.Header.Get("X-Timezone"); timezone != "" {
		components = append(components, "tz:"+timezone)
	}

	// Sort components for consistent fingerprinting
	sort.Strings(components)

	// Create fingerprint string
	fingerprintStr := strings.Join(components, "|")

	// Generate MD5 hash
	hash := md5.Sum([]byte(fingerprintStr))
	return fmt.Sprintf("%x", hash)
}

// ExtractFromHeader gets fingerprint from custom header or generates one
func ExtractFromHeader(r *http.Request) string {
	// First try to get from custom header
	if fp := r.Header.Get("X-Browser-Fingerprint"); fp != "" {
		return fp
	}

	// Otherwise generate from available headers
	return Generate(r)
}