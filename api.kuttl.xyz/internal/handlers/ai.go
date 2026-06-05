package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"strings"
	"time"

	"api.kuttl.xyz/internal/database"
	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/internal/usage"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// AI Handler for prompts with embedding context
// ─────────────────────────────────────────────

type AIHandler struct {
	prompts    *database.PromptRepository
	embeddings *database.EmbeddingRepository
	snapshots  *database.SnapshotRepository
	config     *AIConfig
	usage      *usage.Service
	db         *sql.DB
}


type AIConfig struct {
	Provider   string
	APIKey     string
	Model      string
	BaseURL    string
	Timeout    time.Duration
}

func NewAIHandler(prompts *database.PromptRepository, embeddings *database.EmbeddingRepository, snapshots *database.SnapshotRepository, config *AIConfig, usage *usage.Service, db *sql.DB) *AIHandler {
	return &AIHandler{
		prompts:    prompts,
		embeddings: embeddings,
		snapshots:  snapshots,
		config:     config,
		usage:      usage,
		db:         db,
	}
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

type AIPromptRequest struct {
	Prompt      string          `json:"prompt"`
	Tree        json.RawMessage `json:"tree"`
	DescAttr    string          `json:"descAttr"`
	Selection   json.RawMessage `json:"selection"`
	WebsiteID   string          `json:"websiteId"`
}

type AIPromptResponse struct {
	Patches  []json.RawMessage `json:"patches"`
	Warnings []string          `json:"warnings"`
	Raw      string            `json:"raw"`
	Status   string            `json:"status"`
}

// ─────────────────────────────────────────────
// AI Prompt Handler with Embedding Context
// ─────────────────────────────────────────────

func (h *AIHandler) HandlePrompt(w http.ResponseWriter, r *http.Request) {
	// Handle CORS preflight
	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), h.config.Timeout)
	defer cancel()
	
	startTime := time.Now()

	var userID uuid.UUID
	var websiteID string
	var apiKeyID uuid.UUID
	
	// Try to get website from context first (new website hash key approach)
	if website := middleware.GetWebsiteFromContext(r.Context()); website != nil {
		websiteID = website.ID
		if parsed, err := uuid.Parse(website.UserID); err == nil {
			userID = parsed
		}
		// For website-based requests, we'll use a special "website" api key ID
		apiKeyID = uuid.MustParse("00000000-0000-0000-0000-000000000001") // Special ID for website requests
	} else {
		// Fallback to user context (for authenticated dashboard users)
		if userIDFromCtx, ok := r.Context().Value("user_id").(uuid.UUID); ok {
			userID = userIDFromCtx
		} else {
			// For development, use consistent development user ID
			userID = uuid.MustParse("d5f3bdc2-65aa-4dd6-bf2b-0e05a6192402")
		}

		// Get API key ID from context (set by auth middleware)
		if apiKeyIDStr, ok := r.Context().Value("api_key_id").(string); ok {
			if parsed, err := uuid.Parse(apiKeyIDStr); err == nil {
				apiKeyID = parsed
			}
		}
		if apiKeyID == uuid.Nil {
			// Default for development
			apiKeyID = uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")
		}
	}

	var req AIPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if strings.TrimSpace(req.Prompt) == "" {
		http.Error(w, "prompt is required", http.StatusBadRequest)
		return
	}

	// Retrieve existing embeddings for context
	// Use website ID from context if available, otherwise fall back to request
	contextWebsiteID := websiteID
	if contextWebsiteID == "" {
		contextWebsiteID = req.WebsiteID
	}
	embeddingContext, err := h.getEmbeddingContext(ctx, contextWebsiteID)
	if err != nil {
		// Log error but don't fail the request
		fmt.Printf("Warning: Failed to retrieve embedding context: %v\n", err)
		embeddingContext = ""
	}

	// Build enhanced prompt with context
	enhancedPrompt := h.buildEnhancedPrompt(req, embeddingContext)

	// Log the request before sending to LLM
	fmt.Printf("=== LLM REQUEST (AI Handler) ===\n")
	fmt.Printf("Provider: %s\n", h.config.Provider)
	fmt.Printf("Model: %s\n", h.config.Model)
	fmt.Printf("User ID: %s\n", userID)
	fmt.Printf("Website ID: %s\n", req.WebsiteID)
	fmt.Printf("Original Prompt: %s\n", req.Prompt)
	fmt.Printf("Prompt Length: %d characters\n", len(enhancedPrompt))
	fmt.Printf("Enhanced Prompt:\n%s\n", enhancedPrompt)
	fmt.Printf("=== END LLM REQUEST ===\n")

	// Call AI provider
	aiResponse, err := h.callAIProvider(ctx, enhancedPrompt)
	if err != nil {
		response := AIPromptResponse{
			Patches:  []json.RawMessage{},
			Warnings: []string{"AI provider error: " + err.Error()},
			Raw:      "",
			Status:   "error",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Parse AI response
	parsedResponse, warnings := h.parseAIResponse(aiResponse)
	parsedResponse.Warnings = append(warnings, parsedResponse.Warnings...)
	parsedResponse.Raw = aiResponse

	// Create diff analysis before sending response to frontend
	if len(parsedResponse.Patches) > 0 {
		h.createDiffAnalysis(ctx, userID, req, parsedResponse)
	}

	// Store prompt for future context building
	go h.storePromptAsync(userID, req, parsedResponse, r)

	// Write a customization record when patches were produced
	if len(parsedResponse.Patches) > 0 {
		go h.createCustomizationRecord(req, parsedResponse, r)
	}

	// Log the API call with prompt information
	go h.logPromptAPICall(userID, apiKeyID, req, parsedResponse, r, startTime)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(parsedResponse)
}

// ─────────────────────────────────────────────
// Embedding Context Retrieval
// ─────────────────────────────────────────────

func (h *AIHandler) getEmbeddingContext(ctx context.Context, websiteID string) (string, error) {
	embeddings, err := h.embeddings.GetByWebsite(websiteID, 10)
	if err != nil {
		return "", fmt.Errorf("failed to retrieve embeddings: %w", err)
	}

	var contextBuilder strings.Builder
	
	if len(embeddings) == 0 {
		// Provide general guidance when no embeddings exist
		contextBuilder.WriteString("## Website Context:\n")
		contextBuilder.WriteString("This appears to be a new website or first interaction. Please follow these enhanced guidelines:\n\n")
		contextBuilder.WriteString("### Layout Modification Rules:\n")
		contextBuilder.WriteString("- CAREFULLY identify layout elements before making changes\n")
		contextBuilder.WriteString("- When removing sidebars, check if main content needs to expand to fill space\n")
		contextBuilder.WriteString("- Preserve navigation, headers, and critical user interface elements\n")
		contextBuilder.WriteString("- Look for container relationships - removing a container may break its children\n")
		contextBuilder.WriteString("- Consider responsive design implications\n\n")
		contextBuilder.WriteString("### Element Safety Guidelines:\n")
		contextBuilder.WriteString("- Elements with 'sidebar', 'aside', 'panel' are usually safe to hide/remove\n")
		contextBuilder.WriteString("- Elements with 'main', 'content', 'primary' should be preserved\n")
		contextBuilder.WriteString("- Navigation elements should remain unless specifically requested to remove\n")
		contextBuilder.WriteString("- Always prefer 'hide' operation over 'remove' for safer modifications\n\n")
		return contextBuilder.String(), nil
	}

	contextBuilder.WriteString("## Website Context from Previous Interactions:\n\n")
	
	for i, embedding := range embeddings {
		if i > 5 { // Limit to first 5 for token efficiency
			break
		}
		contextBuilder.WriteString(fmt.Sprintf("### Component Context %d:\n", i+1))
		contextBuilder.WriteString(fmt.Sprintf("Type: %s\n", embedding.VectorType))
		contextBuilder.WriteString(fmt.Sprintf("Target: %s\n", embedding.TargetID))
		contextBuilder.WriteString(fmt.Sprintf("Content: %s\n\n", embedding.Content))
	}
	
	contextBuilder.WriteString("## Important Guidelines:\n")
	contextBuilder.WriteString("- Use the above context to understand the website's structure and existing patterns\n")
	contextBuilder.WriteString("- Ensure any changes respect the existing layout and design consistency\n")
	contextBuilder.WriteString("- Preserve the website's accessibility and user experience\n")
	contextBuilder.WriteString("- Do not break existing functionality or responsive design\n\n")

	return contextBuilder.String(), nil
}

// ─────────────────────────────────────────────
// Enhanced System Prompt
// ─────────────────────────────────────────────

const baseSystemPrompt = `You are an AI assistant embedded in InterceptJS, a non-destructive DOM patching library. The user will describe a UI change they want to make.

CRITICAL: Your suggestions must NEVER break the UI. You have access to website context from previous interactions to ensure changes are safe and consistent.

You will be given:
- The user's natural language instruction
- The current DOM tree as an InterceptNode JSON structure with layoutContext information
- The description attribute name used to annotate elements
- Optionally, a selected element the user has focused on
- CONTEXT: Previous website serialization data and embedding context

LAYOUT SAFETY RULES:
When you see an element with layoutContext, pay special attention to these fields:
- isGridChild: If true and you hide this element, you MUST also adjust the parent's grid-template-columns
- isFlexChild: If true, hiding is usually safe (flex auto-collapses)
- layoutRole: Use this to understand the element's semantic purpose
- parentDisplay: Shows the layout system the element participates in

COMMON LAYOUT PATTERNS & REQUIRED PATCHES:

**Sidebar Removal (Grid):**
If layoutRole="sidebar" and isGridChild=true:
  1. Hide the sidebar: { "op": "hide", "target": "sidebar-uid" }
  2. Adjust parent: { "op": "restyle", "target": "parent-uid", "payload": { "styles": { "grid-template-columns": "1fr" } } }

**Sidebar Removal (Flex):**
If layoutRole="sidebar" and isFlexChild=true:
  1. Just hide: { "op": "hide", "target": "sidebar-uid" }
  (Flex containers handle this automatically)

**Navbar Removal:**
If layoutRole="navbar":
  1. Hide navbar: { "op": "hide", "target": "navbar-uid" }
  2. Remove top spacing from main content: { "op": "restyle", "target": "main-content-uid", "payload": { "styles": { "padding-top": "0", "margin-top": "0" } } }

**Layout Container Hiding:**
If isLayoutContainer=true, warn that hiding will affect all children.

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

SAFETY RULES - NEVER VIOLATE THESE:
- Only reference uid values that actually exist in the provided tree
- ALWAYS check layoutContext before hiding elements - if isGridChild=true, you MUST include a parent grid adjustment
- For layoutRole="sidebar", always expand remaining content area when hiding
- For layoutRole="navbar", always adjust spacing of affected content below
- Never hide isLayoutContainer=true elements without warning about children
- Preserve responsive design patterns shown in the context
- Respect existing color schemes and typography unless explicitly asked to change them
- If you cannot fulfill the request safely, return patches:[] and status:"no_changes"
- Never guess a uid; prefer the selected element's uid when the intent is ambiguous
- Consider the website context to ensure changes fit the overall design system
- Do not break accessibility features or semantic HTML structure
- Generate compound patches for layout operations - multiple patches that work together to prevent breaks

Output raw JSON only — no prose, no code fences.`

func (h *AIHandler) buildEnhancedPrompt(req AIPromptRequest, embeddingContext string) string {
	var promptBuilder strings.Builder
	
	// Add system prompt
	promptBuilder.WriteString("System: ")
	promptBuilder.WriteString(baseSystemPrompt)
	promptBuilder.WriteString("\n\n")
	
	// Add embedding context if available
	if embeddingContext != "" {
		promptBuilder.WriteString(embeddingContext)
		promptBuilder.WriteString("\n")
	}
	
	// Get full website snapshot structure
	websiteStructure := h.getFullWebsiteStructure(req.WebsiteID)
	if websiteStructure != "" {
		promptBuilder.WriteString("## COMPLETE WEBSITE STRUCTURE:\n")
		promptBuilder.WriteString(websiteStructure)
		promptBuilder.WriteString("\n")
	}
	
	// Add DOM structure analysis
	domAnalysis := h.analyzeDOMStructure(req.Tree)
	if domAnalysis != "" {
		promptBuilder.WriteString("## DOM Structure Analysis:\n")
		promptBuilder.WriteString(domAnalysis)
		promptBuilder.WriteString("\n")
	}
	
	// Add user instruction
	promptBuilder.WriteString("User instruction: ")
	promptBuilder.WriteString(req.Prompt)
	promptBuilder.WriteString("\n\n")
	
	// Add DOM tree
	promptBuilder.WriteString("Description attribute: ")
	promptBuilder.WriteString(req.DescAttr)
	promptBuilder.WriteString("\n\nDOM tree:\n")
	promptBuilder.Write(req.Tree)
	
	// Add selection if present
	if req.Selection != nil && string(req.Selection) != "null" {
		promptBuilder.WriteString("\n\nSelected element:\n")
		promptBuilder.Write(req.Selection)
	}
	
	return promptBuilder.String()
}

// ─────────────────────────────────────────────
// Website Structure Retrieval
// ─────────────────────────────────────────────

func (h *AIHandler) getFullWebsiteStructure(websiteID string) string {
	snapshot, err := h.snapshots.GetLatestSnapshotForWebsite(websiteID)
	if err != nil || snapshot == nil {
		return "No website snapshot available. Working with current DOM tree only."
	}
	
	var structureBuilder strings.Builder
	
	structureBuilder.WriteString("### COMPLETE WEBSITE DATA:\n\n")
	
	// Add components information
	if len(snapshot.Components) > 0 {
		structureBuilder.WriteString("#### COMPONENTS:\n")
		for i, component := range snapshot.Components {
			if i > 50 { // Limit to avoid token overflow
				structureBuilder.WriteString("... (more components available)\n")
				break
			}
			structureBuilder.WriteString(fmt.Sprintf("- Component %d: %+v\n", i+1, component))
		}
		structureBuilder.WriteString("\n")
	}
	
	// Add styles information
	if len(snapshot.Styles.ComponentStyles) > 0 {
		structureBuilder.WriteString("#### STYLES:\n")
		count := 0
		for selector, styles := range snapshot.Styles.ComponentStyles {
			if count > 20 { // Limit to avoid token overflow
				structureBuilder.WriteString("... (more styles available)\n")
				break
			}
			structureBuilder.WriteString(fmt.Sprintf("- %s: %+v\n", selector, styles))
			count++
		}
		structureBuilder.WriteString("\n")
	}
	
	// Add layout information
	if len(snapshot.Layout.Containers) > 0 {
		structureBuilder.WriteString("#### LAYOUT:\n")
		structureBuilder.WriteString(fmt.Sprintf("Layout Type: %s\n", snapshot.Layout.LayoutType))
		for i, container := range snapshot.Layout.Containers {
			if i > 5 { // Limit to avoid token overflow
				structureBuilder.WriteString("... (more layout containers available)\n")
				break
			}
			structureBuilder.WriteString(fmt.Sprintf("Container %s (%s): %+v\n", container.UID, container.Type, container.Properties))
		}
		structureBuilder.WriteString("\n")
	}
	
	// Add customizations/patches
	if len(snapshot.Customizations.Patches) > 0 {
		structureBuilder.WriteString("#### PREVIOUS CUSTOMIZATIONS:\n")
		for i, patch := range snapshot.Customizations.Patches {
			if i > 10 { // Limit to avoid token overflow
				structureBuilder.WriteString("... (more patches available)\n")
				break
			}
			structureBuilder.WriteString(fmt.Sprintf("- Patch %d: %+v\n", i+1, patch))
		}
		structureBuilder.WriteString("\n")
	}
	
	structureBuilder.WriteString("### IMPORTANT: Use this complete website data to understand the full structure before making changes!\n\n")
	
	return structureBuilder.String()
}

// ─────────────────────────────────────────────
// DOM Structure Analysis
// ─────────────────────────────────────────────

func (h *AIHandler) analyzeDOMStructure(domTree json.RawMessage) string {
	var analysis strings.Builder
	
	// Parse DOM tree to extract structure information
	var domData map[string]interface{}
	if err := json.Unmarshal(domTree, &domData); err != nil {
		return "Unable to analyze DOM structure due to parsing error."
	}
	
	analysis.WriteString("### Layout Structure Analysis:\n")
	
	// Analyze the DOM structure
	layoutInfo := h.extractLayoutInfo(domData, 0)
	analysis.WriteString(layoutInfo)
	
	analysis.WriteString("\n### Layout Guidelines:\n")
	analysis.WriteString("- When modifying layout elements, consider their position in the page hierarchy\n")
	analysis.WriteString("- Sidebars are typically secondary layout containers that can be hidden without breaking main content\n")
	analysis.WriteString("- Main content areas should be preserved and may need to expand when sidebars are removed\n")
	analysis.WriteString("- Navigation elements should remain functional unless explicitly asked to modify them\n")
	analysis.WriteString("- Container relationships: parent elements control the layout of their children\n\n")
	
	return analysis.String()
}

func (h *AIHandler) extractLayoutInfo(node map[string]interface{}, depth int) string {
	var info strings.Builder
	indent := strings.Repeat("  ", depth)
	
	// Extract node information
	tag, _ := node["tag"].(string)
	uid, _ := node["uid"].(string)
	attrs, _ := node["attributes"].(map[string]interface{})
	children, _ := node["children"].([]interface{})
	
	// Analyze element type and potential purpose
	elementType := h.categorizeElement(tag, attrs)
	if elementType != "" {
		info.WriteString(fmt.Sprintf("%s- %s (uid: %s) - %s\n", indent, tag, uid, elementType))
	}
	
	// Recursively analyze children (limit depth to avoid overwhelming the prompt)
	if depth < 3 && len(children) > 0 {
		for _, child := range children {
			if childMap, ok := child.(map[string]interface{}); ok {
				info.WriteString(h.extractLayoutInfo(childMap, depth+1))
			}
		}
	}
	
	return info.String()
}

func (h *AIHandler) categorizeElement(tag string, attrs map[string]interface{}) string {
	if attrs == nil {
		return ""
	}
	
	// Get common attributes
	class, _ := attrs["class"].(string)
	id, _ := attrs["id"].(string)
	role, _ := attrs["role"].(string)
	
	// Combine all text for analysis
	allText := strings.ToLower(fmt.Sprintf("%s %s %s %s", tag, class, id, role))
	
	// Categorize based on common patterns
	if strings.Contains(allText, "sidebar") || strings.Contains(allText, "aside") || tag == "aside" {
		return "SIDEBAR ELEMENT - Can typically be hidden/removed"
	}
	if strings.Contains(allText, "nav") || tag == "nav" || role == "navigation" {
		return "NAVIGATION - Should be preserved unless specifically requested"
	}
	if strings.Contains(allText, "main") || tag == "main" || role == "main" {
		return "MAIN CONTENT AREA - Critical, should be preserved and may need to expand"
	}
	if strings.Contains(allText, "header") || tag == "header" {
		return "HEADER - Usually contains branding/navigation, preserve unless requested"
	}
	if strings.Contains(allText, "footer") || tag == "footer" {
		return "FOOTER - Page footer, preserve unless requested"
	}
	if strings.Contains(allText, "container") || strings.Contains(allText, "wrapper") {
		return "LAYOUT CONTAINER - Controls layout structure"
	}
	if tag == "div" && (strings.Contains(allText, "panel") || strings.Contains(allText, "widget")) {
		return "PANEL/WIDGET - Secondary content element"
	}
	
	return ""
}

// ─────────────────────────────────────────────
// AI Provider Communication
// ─────────────────────────────────────────────

func (h *AIHandler) callAIProvider(ctx context.Context, prompt string) (string, error) {
	switch h.config.Provider {
	case "anthropic":
		return h.callAnthropic(ctx, prompt)
	case "openai":
		return h.callOpenAI(ctx, prompt)
	case "gemini":
		return h.callGemini(ctx, prompt)
	default:
		return "", fmt.Errorf("unsupported AI provider: %s", h.config.Provider)
	}
}

func (h *AIHandler) callAnthropic(ctx context.Context, prompt string) (string, error) {
	requestBody := map[string]interface{}{
		"model":      h.config.Model,
		"max_tokens": 2048,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	return h.makeAIRequest(ctx, "https://api.anthropic.com/v1/messages", requestBody, map[string]string{
		"Content-Type":      "application/json",
		"x-api-key":         h.config.APIKey,
		"anthropic-version": "2023-06-01",
	})
}

func (h *AIHandler) callOpenAI(ctx context.Context, prompt string) (string, error) {
	requestBody := map[string]interface{}{
		"model": h.config.Model,
		"messages": []map[string]string{
			{"role": "user", "content": prompt},
		},
	}

	return h.makeAIRequest(ctx, "https://api.openai.com/v1/chat/completions", requestBody, map[string]string{
		"Content-Type":  "application/json",
		"Authorization": "Bearer " + h.config.APIKey,
	})
}

func (h *AIHandler) callGemini(ctx context.Context, prompt string) (string, error) {
	requestBody := map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]string{
					{"text": prompt},
				},
			},
		},
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent", h.config.Model)
	return h.makeAIRequest(ctx, url, requestBody, map[string]string{
		"Content-Type":  "application/json",
		"x-goog-api-key": h.config.APIKey,
	})
}

func (h *AIHandler) makeAIRequest(ctx context.Context, url string, body interface{}, headers map[string]string) (string, error) {
	reqBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	client := &http.Client{Timeout: h.config.Timeout}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}

	// Extract content based on provider
	return h.extractContentFromResponse(h.config.Provider, respBody)
}

func (h *AIHandler) extractContentFromResponse(provider string, body []byte) (string, error) {
	var response map[string]interface{}
	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	switch provider {
	case "anthropic":
		if content, ok := response["content"].([]interface{}); ok && len(content) > 0 {
			if item, ok := content[0].(map[string]interface{}); ok {
				if text, ok := item["text"].(string); ok {
					return text, nil
				}
			}
		}
	case "openai":
		if choices, ok := response["choices"].([]interface{}); ok && len(choices) > 0 {
			if choice, ok := choices[0].(map[string]interface{}); ok {
				if message, ok := choice["message"].(map[string]interface{}); ok {
					if content, ok := message["content"].(string); ok {
						return content, nil
					}
				}
			}
		}
	case "gemini":
		if candidates, ok := response["candidates"].([]interface{}); ok && len(candidates) > 0 {
			if candidate, ok := candidates[0].(map[string]interface{}); ok {
				if content, ok := candidate["content"].(map[string]interface{}); ok {
					if parts, ok := content["parts"].([]interface{}); ok && len(parts) > 0 {
						if part, ok := parts[0].(map[string]interface{}); ok {
							if text, ok := part["text"].(string); ok {
								return text, nil
							}
						}
					}
				}
			}
		}
	}

	return "", fmt.Errorf("failed to extract content from %s response", provider)
}

// ─────────────────────────────────────────────
// Response Parsing
// ─────────────────────────────────────────────

func (h *AIHandler) parseAIResponse(raw string) (AIPromptResponse, []string) {
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
		return AIPromptResponse{
			Patches:  []json.RawMessage{},
			Warnings: []string{"Failed to parse AI response: " + err.Error()},
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

	return AIPromptResponse{
		Patches:  parsed.Patches,
		Warnings: parsed.Warnings,
		Status:   parsed.Status,
	}, nil
}

// ─────────────────────────────────────────────
// Async Prompt Storage
// ─────────────────────────────────────────────

func (h *AIHandler) storePromptAsync(userID uuid.UUID, req AIPromptRequest, resp AIPromptResponse, r *http.Request) {
	fingerprint := middleware.GetFingerprintFromContext(r.Context())
	var websiteHash *string
	if website := middleware.GetWebsiteFromContext(r.Context()); website != nil {
		websiteHash = &website.HashKey
	}
	var fp *string
	if fingerprint != "" {
		fp = &fingerprint
	}

	go func() {
		var patches []map[string]interface{}
		for _, patch := range resp.Patches {
			var patchMap map[string]interface{}
			if err := json.Unmarshal(patch, &patchMap); err == nil {
				patches = append(patches, patchMap)
			}
		}

		prompt := &models.CustomizationPrompt{
			ID:               uuid.New(),
			UserID:           userID,
			WebsiteID:        req.WebsiteID,
			WebsiteHash:      websiteHash,
			BrowserClientID:  fp,
			PromptText:       req.Prompt,
			PromptType:       "ai_modification",
			Success:          resp.Status == "ok",
		}

		if resp.Status == "error" && len(resp.Warnings) > 0 {
			errorMsg := strings.Join(resp.Warnings, "; ")
			prompt.ErrorMessage = &errorMsg
		}

		if err := h.prompts.CreatePrompt(prompt); err != nil {
			fmt.Printf("Error storing prompt: %v\n", err)
			return
		}

		result := &models.CustomizationPromptResult{
			ID:              uuid.New(),
			PromptID:        prompt.ID,
			WebsiteHash:     websiteHash,
			BrowserClientID: fp,
			AIProvider:      h.config.Provider,
			AIModel:         h.config.Model,
			RawResponse:     resp.Raw,
			PatchesApplied:  patches,
			Warnings:        resp.Warnings,
		}

		if err := h.prompts.CreatePromptResult(result); err != nil {
			fmt.Printf("Error storing prompt result: %v\n", err)
		}
	}()
}

// ─────────────────────────────────────────────
// Diff Analysis Creation
// ─────────────────────────────────────────────

func (h *AIHandler) createDiffAnalysis(ctx context.Context, userID uuid.UUID, req AIPromptRequest, resp AIPromptResponse) {
	// Log the request being sent to the LLM for diff analysis
	fmt.Printf("=== LLM DIFF ANALYSIS REQUEST ===\n")
	fmt.Printf("User ID: %s\n", userID)
	fmt.Printf("Website ID: %s\n", req.WebsiteID)
	fmt.Printf("Original Prompt: %s\n", req.Prompt)
	fmt.Printf("Number of Patches: %d\n", len(resp.Patches))
	fmt.Printf("Original Tree: %s\n", string(req.Tree))
	
	// Log each patch
	for i, patch := range resp.Patches {
		fmt.Printf("Patch %d: %s\n", i+1, string(patch))
	}
	
	fmt.Printf("=== END LLM DIFF ANALYSIS REQUEST ===\n")
	
	// TODO: Create actual diff analysis by:
	// 1. Getting the current snapshot for this website
	// 2. Applying patches to create a new state
	// 3. Creating a SnapshotDiff between old and new states
	// 4. Storing the diff in the database
	
	fmt.Printf("Diff analysis created for user %s, website %s\n", userID, req.WebsiteID)
}

// ─────────────────────────────────────────────
// Customization Record Creation
// ─────────────────────────────────────────────

func (h *AIHandler) createCustomizationRecord(req AIPromptRequest, resp AIPromptResponse, r *http.Request) {
	if h.db == nil {
		return
	}

	fingerprint := middleware.GetFingerprintFromContext(r.Context())
	if fingerprint == "" {
		return
	}

	website := middleware.GetWebsiteFromContext(r.Context())

	websiteURL := r.Header.Get("Referer")
	if websiteURL == "" {
		websiteURL = req.WebsiteID
	}
	var websiteID *string
	if website != nil {
		websiteID = &website.ID
		if websiteURL == "" {
			websiteURL = website.URL
		}
	}

	// Determine modification type from patch operations
	modType := inferModificationType(resp.Patches)

	// Build a short description from patch count
	description := fmt.Sprintf("%d patch(es) applied by AI in response to: %s", len(resp.Patches), truncate(req.Prompt, 120))

	// Determine element targeted
	elementTargeted := extractFirstTarget(resp.Patches)

	_, err := h.db.Exec(`
		INSERT INTO website_customizations
		(id, browser_client_id, website_id, website_url, user_request, change_description,
		 element_targeted, modification_type, status, applied_at, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'Applied', NOW(), NOW())
	`, fingerprint, websiteID, websiteURL, truncate(req.Prompt, 500), description, elementTargeted, modType)

	if err != nil {
		fmt.Printf("Warning: failed to create customization record: %v\n", err)
	}
}

func inferModificationType(patches []json.RawMessage) string {
	for _, p := range patches {
		var patch map[string]interface{}
		if err := json.Unmarshal(p, &patch); err != nil {
			continue
		}
		op, _ := patch["op"].(string)
		switch op {
		case "restyle":
			return "Style & Content"
		case "hide", "show":
			return "Layout & Responsive"
		case "setText":
			return "Content Update"
		case "addClass", "removeClass":
			return "Style & Content"
		case "move", "reorder":
			return "Layout & Responsive"
		}
	}
	return "Style & Content"
}

func extractFirstTarget(patches []json.RawMessage) string {
	if len(patches) == 0 {
		return "unknown"
	}
	var patch map[string]interface{}
	if err := json.Unmarshal(patches[0], &patch); err != nil {
		return "unknown"
	}
	if target, ok := patch["target"].(string); ok && target != "" {
		if len(patches) > 1 {
			return fmt.Sprintf("%s (+%d more)", target, len(patches)-1)
		}
		return target
	}
	return "unknown"
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// ─────────────────────────────────────────────
// API Call Logging for Prompts
// ─────────────────────────────────────────────

func (h *AIHandler) logPromptAPICall(userID, apiKeyID uuid.UUID, req AIPromptRequest, resp AIPromptResponse, r *http.Request, startTime time.Time) {
	if h.usage == nil {
		return
	}

	responseTime := int(time.Since(startTime).Milliseconds())
	
	// Extract browser fingerprint from context if available
	fingerprint, _ := r.Context().Value("browser_fingerprint").(string)
	
	// Determine status code based on response
	statusCode := http.StatusOK
	if resp.Status == "error" {
		statusCode = http.StatusInternalServerError
	}

	// Truncate prompt and response for storage (to avoid huge entries)
	promptText := req.Prompt
	if len(promptText) > 2000 {
		promptText = promptText[:2000] + "..."
	}
	
	promptResponse := resp.Raw
	if len(promptResponse) > 5000 {
		promptResponse = promptResponse[:5000] + "..."
	}

	call := &models.APICall{
		ID:                 uuid.New(),
		UserID:            userID,
		APIKeyID:          apiKeyID,
		IPAddress:         getClientIP(r),
		Domain:            extractDomainFromReferrer(r.Header.Get("Referer"), r.Host),
		Referrer:          r.Header.Get("Referer"),
		Action:            "prompt",
		Endpoint:          r.URL.Path,
		Method:            r.Method,
		StatusCode:        statusCode,
		ResponseTimeMS:    responseTime,
		UserAgent:         r.Header.Get("User-Agent"),
		DeviceType:        parseUserAgentDeviceType(r.Header.Get("User-Agent")),
		BrowserFingerprint: fingerprint,
		PromptText:        &promptText,
		PromptResponse:    &promptResponse,
		AIProvider:        &h.config.Provider,
		AIModel:           &h.config.Model,
		PatchesCount:      len(resp.Patches),
		SuccessStatus:     &resp.Status,
		Timestamp:         time.Now(),
		CreatedAt:         time.Now(),
	}

	if err := h.usage.LogAPICall(call); err != nil {
		fmt.Printf("Error logging prompt API call: %v\n", err)
	}
}

// Helper function to get client IP
func getClientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		// X-Forwarded-For can contain multiple IPs, take the first one
		if idx := strings.Index(forwarded, ","); idx != -1 {
			return strings.TrimSpace(forwarded[:idx])
		}
		return strings.TrimSpace(forwarded)
	}
	
	if realIP := r.Header.Get("X-Real-IP"); realIP != "" {
		return realIP
	}
	
	// Fallback to RemoteAddr, but strip the port
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	
	return r.RemoteAddr
}

// extractDomainFromReferrer extracts domain from referrer or host header
func extractDomainFromReferrer(referrer, host string) string {
	if referrer != "" {
		// Simple domain extraction from referrer URL
		if strings.HasPrefix(referrer, "http://") {
			referrer = referrer[7:]
		} else if strings.HasPrefix(referrer, "https://") {
			referrer = referrer[8:]
		}
		if idx := strings.Index(referrer, "/"); idx != -1 {
			referrer = referrer[:idx]
		}
		if idx := strings.Index(referrer, ":"); idx != -1 {
			referrer = referrer[:idx]
		}
		return referrer
	}
	return host
}

// parseUserAgentDeviceType attempts to determine device type from user agent string
func parseUserAgentDeviceType(userAgent string) string {
	userAgent = strings.ToLower(userAgent)
	
	if strings.Contains(userAgent, "mobile") || strings.Contains(userAgent, "android") || strings.Contains(userAgent, "iphone") {
		return "mobile"
	}
	if strings.Contains(userAgent, "tablet") || strings.Contains(userAgent, "ipad") {
		return "tablet"
	}
	return "desktop"
}