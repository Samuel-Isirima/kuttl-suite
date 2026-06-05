package models

import (
	"time"
	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// Embedding Vector Model
// ─────────────────────────────────────────────

type EmbeddingVector struct {
	ID         uuid.UUID `json:"id" db:"id"`
	SnapshotID uuid.UUID `json:"snapshot_id" db:"snapshot_id"`
	WebsiteID  string    `json:"website_id" db:"website_id"`
	VectorType string    `json:"vector_type" db:"vector_type"`
	TargetID   string    `json:"target_id" db:"target_id"`
	Vector     []float32 `json:"vector" db:"vector"`
	Dimensions int       `json:"dimensions" db:"dimensions"`
	Model      string    `json:"model" db:"model"`
	TokenCount int       `json:"token_count" db:"token_count"`
	Content    string    `json:"content" db:"content"`
	Metadata   EmbeddingMetadata `json:"metadata" db:"metadata"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}