package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ---------------------------------------------------------------------------
// CSV waitlist logger
// ---------------------------------------------------------------------------

type csvWaitlistLogger struct {
	mu sync.Mutex
	f  *os.File
	w  *csv.Writer
}

var csvHeaders = []string{"timestamp", "email", "role", "framework", "ip"}

func newCSVWaitlistLogger(path string) (*csvWaitlistLogger, error) {
	exists := fileExists(path)

	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("open waitlist csv: %w", err)
	}

	w := csv.NewWriter(f)

	// Write header only when creating the file for the first time
	if !exists {
		if err := w.Write(csvHeaders); err != nil {
			f.Close()
			return nil, fmt.Errorf("write csv header: %w", err)
		}
		w.Flush()
	}

	return &csvWaitlistLogger{f: f, w: w}, nil
}

func (l *csvWaitlistLogger) Write(entry WaitlistEntry) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	err := l.w.Write([]string{
		entry.Timestamp,
		entry.Email,
		entry.Role,
		entry.Framework,
		entry.IP,
	})
	if err != nil {
		return fmt.Errorf("csv write: %w", err)
	}
	l.w.Flush()
	return l.w.Error()
}

func (l *csvWaitlistLogger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.w.Flush()
	return l.f.Close()
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// ---------------------------------------------------------------------------
// Waitlist types
// ---------------------------------------------------------------------------

type WaitlistRequest struct {
	Email     string `json:"email"`
	Role      string `json:"role"`
	Framework string `json:"framework"`
}

type WaitlistEntry struct {
	Timestamp string `json:"timestamp"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Framework string `json:"framework"`
	IP        string `json:"ip"`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

var emailRe = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

var validRoles = map[string]bool{
	"founder":  true,
	"engineer": true,
	"product":  true,
	"design":   true,
	"other":    true,
	"":         true,
}

var validFrameworks = map[string]bool{
	"vanilla": true,
	"react":   true,
	"vue":     true,
	"next":    true,
	"astro":   true,
	"other":   true,
	"":        true,
}

func validateWaitlistRequest(req WaitlistRequest) string {
	email := strings.TrimSpace(req.Email)
	if email == "" {
		return "email is required"
	}
	if !emailRe.MatchString(email) {
		return "email is invalid"
	}
	if len(email) > 254 {
		return "email is too long"
	}
	if !validRoles[req.Role] {
		return "role must be one of: founder, engineer, product, design, other"
	}
	if !validFrameworks[req.Framework] {
		return "framework must be one of: vanilla, react, vue, next, astro, other"
	}
	return ""
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

func (s *server) handleWaitlist(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	ip := realIP(r)

	if !s.limiter.Allow(ip) {
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusTooManyRequests,
			LatencyMs:  time.Since(start).Milliseconds(),
			Error:      "rate limit exceeded",
		})
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "rate limit exceeded: try again in 60 seconds")
		return
	}

	rawBody, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body: "+err.Error())
		return
	}

	var reqLog json.RawMessage
	if json.Valid(rawBody) {
		reqLog = json.RawMessage(rawBody)
	}

	var req WaitlistRequest
	if err := json.Unmarshal(rawBody, &req); err != nil {
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusBadRequest,
			LatencyMs:  time.Since(start).Milliseconds(),
			Request:    reqLog,
			Error:      "invalid JSON: " + err.Error(),
		})
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Role = strings.TrimSpace(req.Role)
	req.Framework = strings.TrimSpace(req.Framework)

	if msg := validateWaitlistRequest(req); msg != "" {
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusUnprocessableEntity,
			LatencyMs:  time.Since(start).Milliseconds(),
			Request:    reqLog,
			Error:      "validation: " + msg,
		})
		writeError(w, http.StatusUnprocessableEntity, msg)
		return
	}

	entry := WaitlistEntry{
		Timestamp: start.UTC().Format(time.RFC3339Nano),
		Email:     req.Email,
		Role:      req.Role,
		Framework: req.Framework,
		IP:        ip,
	}

	if err := s.waitlist.Write(entry); err != nil {
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusInternalServerError,
			LatencyMs:  time.Since(start).Milliseconds(),
			Request:    reqLog,
			Error:      "csv write failed: " + err.Error(),
		})
		writeError(w, http.StatusInternalServerError, "failed to save entry, please try again")
		return
	}

	entryBytes, _ := json.Marshal(entry)
	s.logger.Write(LogEntry{
		Timestamp:  start.UTC().Format(time.RFC3339Nano),
		RemoteIP:   ip,
		Method:     r.Method,
		Path:       r.URL.Path,
		StatusCode: http.StatusCreated,
		LatencyMs:  time.Since(start).Milliseconds(),
		Request:    reqLog,
		Response:   entryBytes,
	})

	writeJSON(w, http.StatusCreated, map[string]string{
		"status":  "ok",
		"message": "You're on the list. We'll be in touch.",
	})
}
