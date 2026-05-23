// cmd/server/main.go
//
// Environment variables
//
//	AI_PROVIDER         required  — "anthropic" | "openai" | "gemini"
//
//	ANTHROPIC_API_KEY   required when AI_PROVIDER=anthropic
//	ANTHROPIC_MODEL     optional  — default: claude-sonnet-4-20250514
//
//	OPENAI_API_KEY      required when AI_PROVIDER=openai
//	OPENAI_MODEL        optional  — default: gpt-4o-mini
//
//	GEMINI_API_KEY      required when AI_PROVIDER=gemini
//	GEMINI_MODEL        optional  — default: gemini-1.5-pro
//
//	PORT                optional  — default: 8080
//	ALLOWED_ORIGINS     optional  — comma-separated, default: *
//	LOG_FILE            optional  — path to JSON log file, default: requests.log
//	WAITLIST_FILE       optional  — path to waitlist CSV, default: waitlist.csv
//	RATE_LIMIT          optional  — max requests per minute per IP, default: 5

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

func requireEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		panic(fmt.Sprintf("Missing env var: %s", key))
	}
	return value
}

// ---------------------------------------------------------------------------
// JSON request/response logger
// ---------------------------------------------------------------------------

type LogEntry struct {
	Timestamp  string          `json:"timestamp"`
	RemoteIP   string          `json:"remote_ip"`
	Method     string          `json:"method"`
	Path       string          `json:"path"`
	StatusCode int             `json:"status_code"`
	LatencyMs  int64           `json:"latency_ms"`
	Request    json.RawMessage `json:"request,omitempty"`
	Response   json.RawMessage `json:"response,omitempty"`
	Error      string          `json:"error,omitempty"`
}

type jsonFileLogger struct {
	mu  sync.Mutex
	f   *os.File
	enc *json.Encoder
}

func newJSONFileLogger(path string) (*jsonFileLogger, error) {
	// Create directory if it doesn't exist
	if path != "" {
		if err := os.MkdirAll("logs", 0755); err != nil {
			return nil, fmt.Errorf("create log directory: %w", err)
		}
	}
	
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("open log file: %w", err)
	}
	enc := json.NewEncoder(f)
	enc.SetEscapeHTML(false)
	return &jsonFileLogger{f: f, enc: enc}, nil
}

func (l *jsonFileLogger) Write(entry LogEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if err := l.enc.Encode(entry); err != nil {
		log.Printf("json logger write error: %v", err)
	}
}

func (l *jsonFileLogger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.f.Close()
}

// ---------------------------------------------------------------------------
// Rate limiter — sliding window, 5 requests / minute / IP (configurable)
// ---------------------------------------------------------------------------

type rateLimiter struct {
	mu       sync.Mutex
	windows  map[string][]time.Time
	limit    int
	window   time.Duration
	stopOnce sync.Once
	stop     chan struct{}
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{
		windows: make(map[string][]time.Time),
		limit:   limit,
		window:  window,
		stop:    make(chan struct{}),
	}
	go rl.purgeLoop()
	return rl
}

func (rl *rateLimiter) Allow(ip string) bool {
	now := time.Now()
	cutoff := now.Add(-rl.window)

	rl.mu.Lock()
	defer rl.mu.Unlock()

	timestamps := rl.windows[ip]
	j := 0
	for _, t := range timestamps {
		if t.After(cutoff) {
			timestamps[j] = t
			j++
		}
	}
	timestamps = timestamps[:j]

	if len(timestamps) >= rl.limit {
		rl.windows[ip] = timestamps
		return false
	}
	rl.windows[ip] = append(timestamps, now)
	return true
}

func (rl *rateLimiter) purgeLoop() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			rl.mu.Lock()
			cutoff := time.Now().Add(-rl.window)
			for ip, timestamps := range rl.windows {
				j := 0
				for _, t := range timestamps {
					if t.After(cutoff) {
						timestamps[j] = t
						j++
					}
				}
				if j == 0 {
					delete(rl.windows, ip)
				} else {
					rl.windows[ip] = timestamps[:j]
				}
			}
			rl.mu.Unlock()
		case <-rl.stop:
			return
		}
	}
}

func (rl *rateLimiter) Stop() {
	rl.stopOnce.Do(func() { close(rl.stop) })
}

func realIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if ip, _, err := net.SplitHostPort(strings.TrimSpace(strings.Split(xff, ",")[0])); err == nil {
			return ip
		}
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ---------------------------------------------------------------------------
// Shared domain types
// ---------------------------------------------------------------------------

type ProxyRequest struct {
	Prompt    string          `json:"prompt"`
	Tree      json.RawMessage `json:"tree"`
	DescAttr  string          `json:"descAttr"`
	Selection json.RawMessage `json:"selection"`
}

type ProxyResponse struct {
	Patches  []json.RawMessage `json:"patches"`
	Warnings []string          `json:"warnings"`
	Raw      string            `json:"raw"`
	Status   string            `json:"status"`
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

type llmProvider interface {
	call(ctx context.Context, userContent string) (string, error)
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

type anthropicProvider struct {
	apiKey string
	model  string
	client *http.Client
}

type anthropicRequest struct {
	Model     string             `json:"model"`
	MaxTokens int                `json:"max_tokens"`
	System    string             `json:"system"`
	Messages  []anthropicMessage `json:"messages"`
}
type anthropicMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type anthropicResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *anthropicProvider) call(ctx context.Context, userContent string) (string, error) {
	body, _ := json.Marshal(anthropicRequest{
		Model:     p.model,
		MaxTokens: 2048,
		System:    systemPrompt,
		Messages:  []anthropicMessage{{Role: "user", Content: userContent}},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", p.apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	res, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	var ar anthropicResponse
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&ar); err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}
	if ar.Error != nil {
		return "", fmt.Errorf("anthropic: %s", ar.Error.Message)
	}
	if len(ar.Content) == 0 {
		return "", fmt.Errorf("anthropic: empty response")
	}
	return ar.Content[0].Text, nil
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

type openaiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

type openaiRequest struct {
	Model    string          `json:"model"`
	Messages []openaiMessage `json:"messages"`
}
type openaiMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}
type openaiResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *openaiProvider) call(ctx context.Context, userContent string) (string, error) {
	body, _ := json.Marshal(openaiRequest{
		Model: p.model,
		Messages: []openaiMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userContent},
		},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.openai.com/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	res, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	var or openaiResponse
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&or); err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}
	if or.Error != nil {
		return "", fmt.Errorf("openai: %s", or.Error.Message)
	}
	if len(or.Choices) == 0 {
		return "", fmt.Errorf("openai: empty response")
	}
	return or.Choices[0].Message.Content, nil
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

type geminiProvider struct {
	apiKey string
	model  string
	client *http.Client
}

type geminiRequest struct {
	SystemInstruction geminiContent   `json:"system_instruction"`
	Contents          []geminiContent `json:"contents"`
}
type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}
type geminiPart struct {
	Text string `json:"text"`
}
type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (p *geminiProvider) call(ctx context.Context, userContent string) (string, error) {
	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"

	body, _ := json.Marshal(geminiRequest{
		SystemInstruction: geminiContent{Parts: []geminiPart{{Text: systemPrompt}}},
		Contents:          []geminiContent{{Parts: []geminiPart{{Text: userContent}}}},
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", p.apiKey)

	res, err := p.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	var gr geminiResponse
	if err := json.NewDecoder(io.LimitReader(res.Body, 2<<20)).Decode(&gr); err != nil {
		return "", fmt.Errorf("decode: %w", err)
	}
	if gr.Error != nil {
		return "", fmt.Errorf("gemini: %s", gr.Error.Message)
	}
	if len(gr.Candidates) == 0 || len(gr.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini: empty response")
	}
	return gr.Candidates[0].Content.Parts[0].Text, nil
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const systemPrompt = `You are an AI assistant embedded in InterceptJS, a non-destructive
DOM patching library. The user will describe a UI change they want to make.

You will be given:
- The user's natural language instruction
- The current DOM tree as an InterceptNode JSON structure
- The description attribute name used to annotate elements
- Optionally, a selected element the user has focused on

Your job is to produce a JSON object — nothing else, no markdown fences — in this exact shape:

{
  "patches": [
    {
      "id":        "<unique string>",
      "target":    "<uid of the target element>",
      "timestamp": <unix ms>,
      "source":    "ai",
      "op":        "restyle" | "reorder" | "move" | "hide" | "show" | "setText" | "addClass" | "removeClass",
      "payload":   { ... }
    }
  ],
  "warnings": ["..."],
  "status": "ok" | "no_changes" | "error"
}

Payload shapes per op:
  restyle     -> { "styles": { "color": "red", ... } }
  reorder     -> { "order": ["uid1", "uid2", ...] }
  move        -> { "newParent": "<uid>", "index": 0 }
  hide        -> {}
  show        -> {}
  setText     -> { "text": "new content" }
  addClass    -> { "classes": ["cls1", "cls2"] }
  removeClass -> { "classes": ["cls1"] }

Rules:
- Only reference uid values that actually exist in the provided tree.
- If you cannot fulfil the request safely, return patches:[] and status:"no_changes".
- Never guess a uid; prefer the selected element's uid when the intent is ambiguous.
- Output raw JSON only — no prose, no code fences.`

// ---------------------------------------------------------------------------
// Config + provider factory
// ---------------------------------------------------------------------------

func buildProvider(client *http.Client) llmProvider {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("AI_PROVIDER")))

	switch provider {
	case "anthropic":
		key := requireEnv("ANTHROPIC_API_KEY")
		model := envOr("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
		return &anthropicProvider{apiKey: key, model: model, client: client}

	case "openai":
		key := requireEnv("OPENAI_API_KEY")
		model := envOr("OPENAI_MODEL", "gpt-4o-mini")
		return &openaiProvider{apiKey: key, model: model, client: client}

	case "gemini":
		key := requireEnv("GEMINI_API_KEY")
		model := envOr("GEMINI_MODEL", "gemini-1.5-pro")
		return &geminiProvider{apiKey: key, model: model, client: client}

	default:
		log.Fatalf("AI_PROVIDER must be one of: anthropic, openai, gemini (got %q)", provider)
		return nil
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

type server struct {
	provider llmProvider
	logger   *jsonFileLogger
	limiter  *rateLimiter
	waitlist *csvWaitlistLogger
}

func (s *server) handlePrompt(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	ip := realIP(r)

	if !s.limiter.Allow(ip) {
		entry := LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusTooManyRequests,
			LatencyMs:  time.Since(start).Milliseconds(),
			Error:      "rate limit exceeded",
		}
		s.logger.Write(entry)
		w.Header().Set("Retry-After", "60")
		writeError(w, http.StatusTooManyRequests, "rate limit exceeded: max 5 requests per minute per IP")
		return
	}

	rawBody, err := io.ReadAll(io.LimitReader(r.Body, 4<<20))
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body: "+err.Error())
		return
	}
	r.Body = io.NopCloser(bytes.NewReader(rawBody))

	var reqLog json.RawMessage
	if json.Valid(rawBody) {
		reqLog = json.RawMessage(rawBody)
	}

	var req ProxyRequest
	if err := json.NewDecoder(bytes.NewReader(rawBody)).Decode(&req); err != nil {
		latency := time.Since(start).Milliseconds()
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusBadRequest,
			LatencyMs:  latency,
			Request:    reqLog,
			Error:      "invalid request body: " + err.Error(),
		})
		writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}
	if strings.TrimSpace(req.Prompt) == "" {
		latency := time.Since(start).Milliseconds()
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusBadRequest,
			LatencyMs:  latency,
			Request:    reqLog,
			Error:      "prompt must not be empty",
		})
		writeError(w, http.StatusBadRequest, "prompt must not be empty")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	userContent := buildUserContent(req)
	
	// Log the request before sending to LLM
	fmt.Printf("=== LLM REQUEST (Proxy Service) ===\n")
	fmt.Printf("User Content Length: %d characters\n", len(userContent))
	fmt.Printf("User Content:\n%s\n", userContent)
	fmt.Printf("=== END LLM REQUEST ===\n")

	raw, llmErr := s.provider.call(ctx, userContent)
	if llmErr != nil {
		log.Printf("llm error: %v", llmErr)
		resp := ProxyResponse{
			Patches:  []json.RawMessage{},
			Warnings: []string{"LLM error: " + llmErr.Error()},
			Raw:      "",
			Status:   "error",
		}
		respBytes, _ := json.Marshal(resp)
		s.logger.Write(LogEntry{
			Timestamp:  start.UTC().Format(time.RFC3339Nano),
			RemoteIP:   ip,
			Method:     r.Method,
			Path:       r.URL.Path,
			StatusCode: http.StatusOK,
			LatencyMs:  time.Since(start).Milliseconds(),
			Request:    reqLog,
			Response:   respBytes,
			Error:      llmErr.Error(),
		})
		writeJSON(w, http.StatusOK, resp)
		return
	}

	resp, warnings := parseLLMOutput(raw)
	resp.Warnings = append(warnings, resp.Warnings...)
	resp.Raw = raw

	respBytes, _ := json.Marshal(resp)
	s.logger.Write(LogEntry{
		Timestamp:  start.UTC().Format(time.RFC3339Nano),
		RemoteIP:   ip,
		Method:     r.Method,
		Path:       r.URL.Path,
		StatusCode: http.StatusOK,
		LatencyMs:  time.Since(start).Milliseconds(),
		Request:    reqLog,
		Response:   respBytes,
	})

	writeJSON(w, http.StatusOK, resp)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func buildUserContent(req ProxyRequest) string {
	var sb strings.Builder
	sb.WriteString("User instruction: ")
	sb.WriteString(req.Prompt)
	sb.WriteString("\n\nDescription attribute: ")
	sb.WriteString(req.DescAttr)
	sb.WriteString("\n\nDOM tree:\n")
	sb.Write(req.Tree)
	if req.Selection != nil && string(req.Selection) != "null" {
		sb.WriteString("\n\nSelected element:\n")
		sb.Write(req.Selection)
	}
	return sb.String()
}

func parseLLMOutput(raw string) (ProxyResponse, []string) {
	clean := strings.TrimSpace(raw)
	if strings.HasPrefix(clean, "```") {
		if idx := strings.Index(clean, "\n"); idx != -1 {
			clean = clean[idx+1:]
		}
		clean = strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(clean), "```"))
	}

	var parsed struct {
		Patches  []json.RawMessage `json:"patches"`
		Warnings []string          `json:"warnings"`
		Status   string            `json:"status"`
	}
	if err := json.Unmarshal([]byte(clean), &parsed); err != nil {
		return ProxyResponse{
			Patches:  []json.RawMessage{},
			Warnings: []string{"Failed to parse LLM output: " + err.Error()},
			Status:   "error",
		}, nil
	}

	if parsed.Patches == nil {
		parsed.Patches = []json.RawMessage{}
	}
	if parsed.Status == "" {
		if len(parsed.Patches) == 0 {
			parsed.Status = "no_changes"
		} else {
			parsed.Status = "ok"
		}
	}

	return ProxyResponse{
		Patches:  parsed.Patches,
		Warnings: parsed.Warnings,
		Status:   parsed.Status,
	}, nil
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	writeJSON(w, code, map[string]string{"error": msg})
}

// ---------------------------------------------------------------------------
// CORS + method guard middleware
// ---------------------------------------------------------------------------

func corsMiddleware(origins []string, next http.Handler) http.Handler {
	isAllowed := func(origin string) bool {
		for _, o := range origins {
			if o == "*" || o == origin {
				return true
			}
		}
		return false
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if len(origins) == 1 && origins[0] == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if origin != "" && isAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func jsonPostOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "only POST is accepted")
			return
		}
		if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			writeError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

func main() {
	httpClient := &http.Client{Timeout: 50 * time.Second}

	logPath := envOr("LOG_FILE", "requests.log")
	fileLogger, err := newJSONFileLogger(logPath)
	if err != nil {
		log.Fatalf("failed to open log file %q: %v", logPath, err)
	}
	defer fileLogger.Close()

	waitlistPath := envOr("WAITLIST_FILE", "waitlist.csv")
	waitlistLogger, err := newCSVWaitlistLogger(waitlistPath)
	if err != nil {
		log.Fatalf("failed to open waitlist file %q: %v", waitlistPath, err)
	}
	defer waitlistLogger.Close()

	limiter := newRateLimiter(5, time.Minute)
	defer limiter.Stop()

	srv := &server{
		provider: buildProvider(httpClient),
		logger:   fileLogger,
		limiter:  limiter,
		waitlist: waitlistLogger,
	}

	port := envOr("PORT", "8080")
	originsRaw := envOr("ALLOWED_ORIGINS", "*")

	var origins []string
	for _, o := range strings.Split(originsRaw, ",") {
		if t := strings.TrimSpace(o); t != "" {
			origins = append(origins, t)
		}
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.Handle("/prompt", jsonPostOnly(http.HandlerFunc(srv.handlePrompt)))
	mux.Handle("/waitlist", jsonPostOnly(http.HandlerFunc(srv.handleWaitlist)))

	log.Printf("kuttl AI proxy listening on :%s (provider: %s, log: %s)", port, os.Getenv("AI_PROVIDER"), logPath)
	if err := http.ListenAndServe(":"+port, corsMiddleware(origins, mux)); err != nil {
		log.Fatal(err)
	}
}
