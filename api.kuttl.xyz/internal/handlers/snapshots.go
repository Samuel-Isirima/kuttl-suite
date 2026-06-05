package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"api.kuttl.xyz/internal/database"
	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/internal/services"
)

// ─────────────────────────────────────────────
// Snapshot Handlers
// ─────────────────────────────────────────────

type SnapshotHandler struct {
	snapshots *database.SnapshotRepository
	embedding *services.EmbeddingService
}

func NewSnapshotHandler(snapshots *database.SnapshotRepository, embedding *services.EmbeddingService) *SnapshotHandler {
	return &SnapshotHandler{
		snapshots: snapshots,
		embedding: embedding,
	}
}

// ─────────────────────────────────────────────
// HTTP Handlers
// ─────────────────────────────────────────────

func (h *SnapshotHandler) CreateSnapshot(w http.ResponseWriter, r *http.Request) {
	// Identity comes from the browser client, not a user account
	fingerprint := middleware.GetFingerprintFromContext(r.Context())
	website := middleware.GetWebsiteFromContext(r.Context())

	var req CreateSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.WebsiteID == "" {
		http.Error(w, "website_id is required", http.StatusBadRequest)
		return
	}

	// Reject if a snapshot already exists for this website
	if exists, err := h.snapshots.SnapshotExistsForWebsite(req.WebsiteID); err == nil && exists {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{"error": "snapshot already exists for this website"})
		return
	}

	if req.Version == "" {
		req.Version = fmt.Sprintf("v%d", time.Now().Unix())
	}
	if req.TriggerType == "" {
		req.TriggerType = "auto_snapshot"
	}

	// Upsert the browser client so we have a valid FK target
	var browserClientID *string
	if fingerprint != "" && website != nil {
		if err := h.snapshots.UpsertBrowserClient(fingerprint, website.HashKey); err != nil {
			log.Printf("Warning: failed to upsert browser_client: %v", err)
		} else {
			browserClientID = &fingerprint
		}
	}

	newSnapshot := &models.WebsiteSnapshot{
		WebsiteID:       req.WebsiteID,
		BrowserClientID: browserClientID,
		Version:         req.Version,
		Components:      req.Components,
		Styles:          req.Styles,
		Layout:          req.Layout,
		Customizations:  req.Customizations,
		Metadata:        req.Metadata,
		TriggerType:     req.TriggerType,
	}

	newSnapshot.ID = uuid.New()
	if err := h.snapshots.CreateSnapshot(newSnapshot); err != nil {
		http.Error(w, "Failed to create snapshot", http.StatusInternalServerError)
		return
	}

	log.Printf("Created snapshot %s for website %s (browser_client: %v)", newSnapshot.ID, req.WebsiteID, browserClientID)

	// Process embeddings asynchronously
	if h.embedding != nil {
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
			defer cancel()
			if err := h.embedding.ProcessSnapshot(ctx, newSnapshot.ID); err != nil {
				log.Printf("Error processing embeddings for snapshot %s: %v", newSnapshot.ID, err)
			}
		}()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateSnapshotResponse{
		ID:        newSnapshot.ID,
		WebsiteID: newSnapshot.WebsiteID,
		Version:   newSnapshot.Version,
		CreatedAt: newSnapshot.CreatedAt,
	})
}

func (h *SnapshotHandler) GetSnapshot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	snapshotID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid snapshot ID", http.StatusBadRequest)
		return
	}

	snapshot, err := h.snapshots.GetSnapshot(snapshotID)
	if err != nil {
		http.Error(w, "Snapshot not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(snapshot)
}

func (h *SnapshotHandler) ListSnapshots(w http.ResponseWriter, r *http.Request) {
	websiteID := r.URL.Query().Get("website_id")
	if websiteID == "" {
		http.Error(w, "website_id parameter is required", http.StatusBadRequest)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	snapshots, err := h.snapshots.ListSnapshots(websiteID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to list snapshots", http.StatusInternalServerError)
		return
	}

	response := ListSnapshotsResponse{
		Snapshots: make([]SnapshotSummary, len(snapshots)),
		Count:     len(snapshots),
		Limit:     limit,
		Offset:    offset,
	}

	for i, snapshot := range snapshots {
		response.Snapshots[i] = SnapshotSummary{
			ID:             snapshot.ID,
			WebsiteID:      snapshot.WebsiteID,
			Version:        snapshot.Version,
			ComponentCount: len(snapshot.Components),
			PatchCount:     len(snapshot.Customizations.Patches),
			CreatedAt:      snapshot.CreatedAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *SnapshotHandler) DeleteSnapshot(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	snapshotID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid snapshot ID", http.StatusBadRequest)
		return
	}

	// Delete embeddings first
	if err := h.snapshots.DeleteEmbeddingsBySnapshot(snapshotID); err != nil {
		http.Error(w, "Failed to delete embeddings", http.StatusInternalServerError)
		return
	}

	// Delete snapshot
	if err := h.snapshots.DeleteSnapshot(snapshotID); err != nil {
		http.Error(w, "Failed to delete snapshot", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SnapshotHandler) GetSnapshotStats(w http.ResponseWriter, r *http.Request) {
	websiteID := r.URL.Query().Get("website_id")
	if websiteID == "" {
		http.Error(w, "website_id parameter is required", http.StatusBadRequest)
		return
	}

	stats, err := h.snapshots.GetSnapshotStats(websiteID)
	if err != nil {
		http.Error(w, "Failed to get stats", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// ─────────────────────────────────────────────
// Diff Handlers
// ─────────────────────────────────────────────

func (h *SnapshotHandler) CreateDiff(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateDiffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	fromSnapshot, err := h.snapshots.GetSnapshot(req.FromSnapshot)
	if err != nil {
		http.Error(w, "From snapshot not found", http.StatusNotFound)
		return
	}

	toSnapshot, err := h.snapshots.GetSnapshot(req.ToSnapshot)
	if err != nil {
		http.Error(w, "To snapshot not found", http.StatusNotFound)
		return
	}

	diff := &models.SnapshotDiff{
		ID:             uuid.New(),
		FromSnapshot:   req.FromSnapshot,
		ToSnapshot:     req.ToSnapshot,
		WebsiteID:      fromSnapshot.WebsiteID,
		UserID:         user.ID,
		FromVersion:    fromSnapshot.Version,
		ToVersion:      toSnapshot.Version,
		Components:     req.Components,
		Styles:         req.Styles,
		Layout:         req.Layout,
		Customizations: req.Customizations,
	}

	if err := h.snapshots.CreateDiff(diff); err != nil {
		http.Error(w, "Failed to create diff", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diff)
}

func (h *SnapshotHandler) GetDiff(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	diffID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid diff ID", http.StatusBadRequest)
		return
	}

	diff, err := h.snapshots.GetDiff(diffID)
	if err != nil {
		http.Error(w, "Diff not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diff)
}

func (h *SnapshotHandler) ListDiffs(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(uuid.UUID)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	websiteID := r.URL.Query().Get("website_id")
	if websiteID == "" {
		http.Error(w, "website_id parameter is required", http.StatusBadRequest)
		return
	}

	limit := 20
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	diffs, err := h.snapshots.ListDiffs(websiteID, userID, limit, offset)
	if err != nil {
		http.Error(w, "Failed to list diffs", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diffs)
}

// ─────────────────────────────────────────────
// Embedding Handlers
// ─────────────────────────────────────────────

func (h *SnapshotHandler) SearchSimilarComponents(w http.ResponseWriter, r *http.Request) {
	// Check if embedding service is available
	if h.embedding == nil {
		http.Error(w, "Embeddings not available", http.StatusServiceUnavailable)
		return
	}

	var req SearchSimilarRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.WebsiteID == "" || req.Query == "" {
		http.Error(w, "website_id and query are required", http.StatusBadRequest)
		return
	}

	if req.Limit == 0 {
		req.Limit = 10
	}

	// Generate query embedding
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	queryVector, err := h.embedding.GenerateQueryEmbedding(ctx, req.Query)
	if err != nil {
		http.Error(w, "Failed to process query", http.StatusInternalServerError)
		return
	}

	// Find similar components
	embeddings, err := h.embedding.FindSimilarComponents(ctx, req.WebsiteID, queryVector, req.Limit)
	if err != nil {
		http.Error(w, "Failed to search components", http.StatusInternalServerError)
		return
	}

	response := SearchSimilarResponse{
		Query:   req.Query,
		Results: make([]EmbeddingResult, len(embeddings)),
	}

	for i, embedding := range embeddings {
		response.Results[i] = EmbeddingResult{
			ID:         embedding.ID,
			SnapshotID: embedding.SnapshotID,
			TargetID:   embedding.TargetID,
			VectorType: embedding.VectorType,
			Content:    embedding.Content,
			Metadata:   embedding.Metadata,
			CreatedAt:  embedding.CreatedAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *SnapshotHandler) GetSnapshotEmbeddings(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	snapshotID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid snapshot ID", http.StatusBadRequest)
		return
	}

	embeddings, err := h.snapshots.GetEmbeddingsBySnapshot(snapshotID)
	if err != nil {
		http.Error(w, "Failed to get embeddings", http.StatusInternalServerError)
		return
	}

	response := SnapshotEmbeddingsResponse{
		SnapshotID: snapshotID,
		Embeddings: make([]EmbeddingInfo, len(embeddings)),
		Status:     "completed",
	}

	// If no embeddings found, it might still be processing
	if len(embeddings) == 0 {
		response.Status = "processing"
	}

	for i, embedding := range embeddings {
		response.Embeddings[i] = EmbeddingInfo{
			ID:         embedding.ID,
			VectorType: embedding.VectorType,
			TargetID:   embedding.TargetID,
			Dimensions: embedding.Dimensions,
			Model:      embedding.Model,
			TokenCount: embedding.TokenCount,
			Metadata:   embedding.Metadata,
			CreatedAt:  embedding.CreatedAt,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// ─────────────────────────────────────────────
// Snapshot Existence Check
// ─────────────────────────────────────────────

// SnapshotExists returns {"exists": true/false} for a given website_id.
// Used by the widget to skip sending a snapshot when one already exists.
func (h *SnapshotHandler) SnapshotExists(w http.ResponseWriter, r *http.Request) {
	websiteID := r.URL.Query().Get("website_id")
	if websiteID == "" {
		http.Error(w, "website_id parameter is required", http.StatusBadRequest)
		return
	}

	exists, err := h.snapshots.SnapshotExistsForWebsite(websiteID)
	if err != nil {
		http.Error(w, "Failed to check snapshot existence", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"exists": exists})
}

// ─────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────

type CreateSnapshotRequest struct {
	WebsiteID      string                       `json:"website_id"`
	Version        string                       `json:"version,omitempty"`
	Components     models.ComponentStateArray   `json:"components"`
	Styles         models.StyleSnapshot         `json:"styles"`
	Layout         models.LayoutStructure       `json:"layout"`
	Customizations models.CustomizationLayer    `json:"customizations"`
	Metadata       models.SnapshotMetadata      `json:"metadata"`
	
	// Prompt context (new fields)
	PromptText         string `json:"prompt_text,omitempty"`
	PromptType         string `json:"prompt_type,omitempty"`
	SelectedElementUID string `json:"selected_element_uid,omitempty"`
	PageURL            string `json:"page_url,omitempty"`
	UserAgent          string `json:"user_agent,omitempty"`
	TriggerType        string `json:"trigger_type,omitempty"` // 'manual', 'ai_prompt', 'auto_sync'
}

type CreateSnapshotResponse struct {
	ID        uuid.UUID `json:"id"`
	WebsiteID string    `json:"website_id"`
	Version   string    `json:"version"`
	CreatedAt time.Time `json:"created_at"`
}

type SnapshotSummary struct {
	ID             uuid.UUID `json:"id"`
	WebsiteID      string    `json:"website_id"`
	Version        string    `json:"version"`
	ComponentCount int       `json:"component_count"`
	PatchCount     int       `json:"patch_count"`
	CreatedAt      time.Time `json:"created_at"`
}

type ListSnapshotsResponse struct {
	Snapshots []SnapshotSummary `json:"snapshots"`
	Count     int               `json:"count"`
	Limit     int               `json:"limit"`
	Offset    int               `json:"offset"`
}

type CreateDiffRequest struct {
	FromSnapshot   uuid.UUID                  `json:"from_snapshot"`
	ToSnapshot     uuid.UUID                  `json:"to_snapshot"`
	Components     models.ComponentDiff       `json:"components"`
	Styles         models.StyleDiff           `json:"styles"`
	Layout         models.LayoutDiff          `json:"layout"`
	Customizations models.CustomizationDiff   `json:"customizations"`
}

type SearchSimilarRequest struct {
	WebsiteID string `json:"website_id"`
	Query     string `json:"query"`
	Limit     int    `json:"limit,omitempty"`
}

type EmbeddingResult struct {
	ID         uuid.UUID                 `json:"id"`
	SnapshotID uuid.UUID                 `json:"snapshot_id"`
	TargetID   string                    `json:"target_id"`
	VectorType string                    `json:"vector_type"`
	Content    string                    `json:"content"`
	Metadata   models.EmbeddingMetadata  `json:"metadata"`
	CreatedAt  time.Time                 `json:"created_at"`
}

type SearchSimilarResponse struct {
	Query   string            `json:"query"`
	Results []EmbeddingResult `json:"results"`
}

type EmbeddingInfo struct {
	ID         uuid.UUID                 `json:"id"`
	VectorType string                    `json:"vector_type"`
	TargetID   string                    `json:"target_id"`
	Dimensions int                       `json:"dimensions"`
	Model      string                    `json:"model"`
	TokenCount int                       `json:"token_count"`
	Metadata   models.EmbeddingMetadata  `json:"metadata"`
	CreatedAt  time.Time                 `json:"created_at"`
}

type SnapshotEmbeddingsResponse struct {
	SnapshotID uuid.UUID       `json:"snapshot_id"`
	Embeddings []EmbeddingInfo `json:"embeddings"`
	Status     string          `json:"status"` // "processing", "completed"
}

