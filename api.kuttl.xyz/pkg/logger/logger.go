package logger

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

type Logger struct {
	file *os.File
}

type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Method    string `json:"method"`
	Path      string `json:"path"`
	Status    int    `json:"status"`
	Duration  string `json:"duration"`
	IP        string `json:"ip"`
	UserAgent string `json:"user_agent"`
}

func NewLogger(logFile string) (*Logger, error) {
	// Extract directory from log file path and create if it doesn't exist
	if logFile != "" {
		logDir := filepath.Dir(logFile)
		if err := os.MkdirAll(logDir, 0755); err != nil {
			return nil, err
		}
	}

	file, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return nil, err
	}

	return &Logger{file: file}, nil
}

func (l *Logger) Close() error {
	return l.file.Close()
}

func (l *Logger) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a custom response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}
		
		next.ServeHTTP(wrapped, r)

		// Log the request
		entry := LogEntry{
			Timestamp: start.Format(time.RFC3339),
			Method:    r.Method,
			Path:      r.URL.Path,
			Status:    wrapped.statusCode,
			Duration:  time.Since(start).String(),
			IP:        getClientIP(r),
			UserAgent: r.Header.Get("User-Agent"),
		}

		if jsonBytes, err := json.Marshal(entry); err == nil {
			l.file.Write(jsonBytes)
			l.file.WriteString("\n")
		}
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func getClientIP(r *http.Request) string {
	// Check X-Forwarded-For header
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return xff
	}

	// Check X-Real-IP header
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}

	// Fall back to remote address
	return r.RemoteAddr
}

// Simple console logging functions
func Info(msg string) {
	log.Printf("[INFO] %s", msg)
}

func Error(msg string) {
	log.Printf("[ERROR] %s", msg)
}

func Fatal(msg string) {
	log.Fatalf("[FATAL] %s", msg)
}