package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// AI Provider Implementations
// ─────────────────────────────────────────────

type OpenAIProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

type AnthropicProvider struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewOpenAIProvider(apiKey string) *OpenAIProvider {
	return &OpenAIProvider{
		apiKey:  apiKey,
		baseURL: "https://api.openai.com/v1",
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func NewAnthropicProvider(apiKey string) *AnthropicProvider {
	return &AnthropicProvider{
		apiKey:  apiKey,
		baseURL: "https://api.anthropic.com/v1",
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ─────────────────────────────────────────────
// OpenAI Implementation
// ─────────────────────────────────────────────

func (p *OpenAIProvider) GenerateEmbedding(ctx context.Context, content string, model string) ([]float32, int, error) {
	if model == "" {
		model = "text-embedding-3-small"
	}

	request := OpenAIEmbeddingRequest{
		Model: model,
		Input: content,
	}

	reqBody, err := json.Marshal(request)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/embeddings", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, 0, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var response OpenAIEmbeddingResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, 0, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Data) == 0 {
		return nil, 0, fmt.Errorf("no embeddings returned")
	}

	// Convert []float64 to []float32
	embedding := make([]float32, len(response.Data[0].Embedding))
	for i, val := range response.Data[0].Embedding {
		embedding[i] = float32(val)
	}

	return embedding, response.Usage.TotalTokens, nil
}

func (p *OpenAIProvider) GenerateEmbeddings(ctx context.Context, contents []string, model string) ([][]float32, []int, error) {
	if model == "" {
		model = "text-embedding-3-small"
	}

	request := OpenAIEmbeddingRequest{
		Model: model,
		Input: contents,
	}

	reqBody, err := json.Marshal(request)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/embeddings", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("API error: %s - %s", resp.Status, string(body))
	}

	var response OpenAIEmbeddingResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, nil, fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if len(response.Data) != len(contents) {
		return nil, nil, fmt.Errorf("expected %d embeddings, got %d", len(contents), len(response.Data))
	}

	embeddings := make([][]float32, len(response.Data))
	tokenCounts := make([]int, len(response.Data))

	for i, data := range response.Data {
		embedding := make([]float32, len(data.Embedding))
		for j, val := range data.Embedding {
			embedding[j] = float32(val)
		}
		embeddings[i] = embedding
		
		// OpenAI doesn't return per-input token counts, so we estimate
		tokenCounts[i] = response.Usage.TotalTokens / len(contents)
	}

	return embeddings, tokenCounts, nil
}

// ─────────────────────────────────────────────
// Anthropic Implementation (Future)
// ─────────────────────────────────────────────

func (p *AnthropicProvider) GenerateEmbedding(ctx context.Context, content string, model string) ([]float32, int, error) {
	// Anthropic doesn't currently offer embedding models
	// This is a placeholder for future implementation
	return nil, 0, fmt.Errorf("Anthropic embedding models not yet available")
}

func (p *AnthropicProvider) GenerateEmbeddings(ctx context.Context, contents []string, model string) ([][]float32, []int, error) {
	return nil, nil, fmt.Errorf("Anthropic embedding models not yet available")
}

// ─────────────────────────────────────────────
// OpenAI API Types
// ─────────────────────────────────────────────

type OpenAIEmbeddingRequest struct {
	Model string      `json:"model"`
	Input interface{} `json:"input"` // string or []string
}

type OpenAIEmbeddingResponse struct {
	Object string                   `json:"object"`
	Data   []OpenAIEmbeddingData    `json:"data"`
	Model  string                   `json:"model"`
	Usage  OpenAIEmbeddingUsage     `json:"usage"`
}

type OpenAIEmbeddingData struct {
	Object    string    `json:"object"`
	Index     int       `json:"index"`
	Embedding []float64 `json:"embedding"`
}

type OpenAIEmbeddingUsage struct {
	PromptTokens int `json:"prompt_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

// ─────────────────────────────────────────────
// AI Context Service
// ─────────────────────────────────────────────

type AIContextService struct {
	provider AIProvider
	embeddings *EmbeddingService
}

func NewAIContextService(provider AIProvider, embeddings *EmbeddingService) *AIContextService {
	return &AIContextService{
		provider:   provider,
		embeddings: embeddings,
	}
}

func (s *AIContextService) GenerateWebsiteContext(ctx context.Context, websiteID string, userID string, query string) (*AIContextResponse, error) {
	// Generate query embedding
	queryVector, err := s.embeddings.GenerateQueryEmbedding(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to generate query embedding: %w", err)
	}

	// Find similar components
	// This would be implemented with proper UUID parsing for userID
	// For now, we'll return a placeholder response
	_ = queryVector // Mark as unused until similarity search is fully implemented
	
	return &AIContextResponse{
		Query: query,
		Context: WebsiteContextInfo{
			Summary: fmt.Sprintf("Context for query '%s' on website %s", query, websiteID),
			RelevantComponents: []string{},
			StylePatterns: map[string]interface{}{},
			LayoutInfo: map[string]interface{}{},
			Suggestions: []string{
				"Consider updating the color scheme",
				"Improve spacing between elements",
				"Add interactive hover effects",
			},
		},
		Confidence: 0.85,
	}, nil
}

type AIContextResponse struct {
	Query      string              `json:"query"`
	Context    WebsiteContextInfo  `json:"context"`
	Confidence float64             `json:"confidence"`
	GeneratedAt time.Time          `json:"generated_at"`
}

type WebsiteContextInfo struct {
	Summary            string                 `json:"summary"`
	RelevantComponents []string               `json:"relevant_components"`
	StylePatterns      map[string]interface{} `json:"style_patterns"`
	LayoutInfo         map[string]interface{} `json:"layout_info"`
	Suggestions        []string               `json:"suggestions"`
}

// ─────────────────────────────────────────────
// Background Processing Service
// ─────────────────────────────────────────────

type BackgroundProcessor struct {
	embedding *EmbeddingService
	ai        *AIContextService
}

func NewBackgroundProcessor(embedding *EmbeddingService, ai *AIContextService) *BackgroundProcessor {
	return &BackgroundProcessor{
		embedding: embedding,
		ai:        ai,
	}
}

func (p *BackgroundProcessor) ProcessSnapshotAsync(snapshotID string) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
		defer cancel()

		// Parse UUID
		snapshotUUID, err := parseUUID(snapshotID)
		if err != nil {
			fmt.Printf("Error parsing snapshot ID %s: %v\n", snapshotID, err)
			return
		}

		// Process embeddings
		if err := p.embedding.ProcessSnapshot(ctx, snapshotUUID); err != nil {
			fmt.Printf("Error processing snapshot %s: %v\n", snapshotID, err)
		} else {
			fmt.Printf("Successfully processed snapshot %s\n", snapshotID)
		}
	}()
}

func parseUUID(s string) (uuid.UUID, error) {
	return uuid.Parse(s)
}