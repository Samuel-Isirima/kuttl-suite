package database

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"api.kuttl.xyz/internal/models"
)

// ─────────────────────────────────────────────
// Snapshot Repository
// ─────────────────────────────────────────────

type SnapshotRepository struct {
	db *DB
}

func NewSnapshotRepository(db *DB) *SnapshotRepository {
	return &SnapshotRepository{db: db}
}

// ─────────────────────────────────────────────
// Website Snapshot Operations
// ─────────────────────────────────────────────

// GetLatestSnapshotForWebsite returns the most recent snapshot for a website+user combination
func (r *SnapshotRepository) GetLatestSnapshotForWebsite(websiteID string, userID uuid.UUID) (*models.WebsiteSnapshot, error) {
	query := `
		SELECT id, website_id, user_id, session_id, version, components, 
		       styles, layout, customizations, metadata, prompt_id, trigger_type, created_at, updated_at
		FROM website_snapshots 
		WHERE website_id = $1 AND user_id = $2 
		ORDER BY created_at DESC 
		LIMIT 1
	`
	
	var snapshot models.WebsiteSnapshot
	var componentsJSON, stylesJSON, layoutJSON, customizationsJSON, metadataJSON string
	
	err := r.db.QueryRow(query, websiteID, userID).Scan(
		&snapshot.ID, &snapshot.WebsiteID, &snapshot.UserID, &snapshot.SessionID, &snapshot.Version,
		&componentsJSON, &stylesJSON, &layoutJSON, &customizationsJSON, &metadataJSON,
		&snapshot.PromptID, &snapshot.TriggerType, &snapshot.CreatedAt, &snapshot.UpdatedAt,
	)
	
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No snapshot exists yet
		}
		return nil, fmt.Errorf("failed to get latest snapshot: %w", err)
	}
	
	// Parse JSON fields
	if err := json.Unmarshal([]byte(componentsJSON), &snapshot.Components); err != nil {
		return nil, fmt.Errorf("failed to unmarshal components: %w", err)
	}
	if err := json.Unmarshal([]byte(stylesJSON), &snapshot.Styles); err != nil {
		return nil, fmt.Errorf("failed to unmarshal styles: %w", err)
	}
	if err := json.Unmarshal([]byte(layoutJSON), &snapshot.Layout); err != nil {
		return nil, fmt.Errorf("failed to unmarshal layout: %w", err)
	}
	if err := json.Unmarshal([]byte(customizationsJSON), &snapshot.Customizations); err != nil {
		return nil, fmt.Errorf("failed to unmarshal customizations: %w", err)
	}
	if err := json.Unmarshal([]byte(metadataJSON), &snapshot.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}
	
	return &snapshot, nil
}

// CheckSnapshotDuplicate checks if a snapshot with identical content already exists
// Returns the existing snapshot ID if found, nil if it's unique
func (r *SnapshotRepository) CheckSnapshotDuplicate(websiteID string, userID uuid.UUID, snapshot *models.WebsiteSnapshot) (*uuid.UUID, error) {
	// Get content hashes for comparison
	componentsHash, stylesHash, layoutHash, customizationsHash, err := r.generateContentHashes(snapshot)
	if err != nil {
		return nil, fmt.Errorf("failed to generate content hashes: %w", err)
	}
	
	// Query for snapshots with identical content within the last 24 hours
	// (to avoid checking every snapshot ever created)
	query := `
		SELECT id, components, styles, layout, customizations
		FROM website_snapshots 
		WHERE website_id = $1 AND user_id = $2 
		AND created_at > NOW() - INTERVAL '24 hours'
		ORDER BY created_at DESC
		LIMIT 10
	`
	
	rows, err := r.db.Query(query, websiteID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent snapshots: %w", err)
	}
	defer rows.Close()
	
	for rows.Next() {
		var id uuid.UUID
		var componentsJSON, stylesJSON, layoutJSON, customizationsJSON string
		
		if err := rows.Scan(&id, &componentsJSON, &stylesJSON, &layoutJSON, &customizationsJSON); err != nil {
			continue // Skip problematic rows
		}
		
		// Compare content hashes
		if r.compareContentHashes(componentsJSON, stylesJSON, layoutJSON, customizationsJSON, 
			componentsHash, stylesHash, layoutHash, customizationsHash) {
			return &id, nil // Found duplicate
		}
	}
	
	return nil, nil // No duplicate found
}

// UpdateSnapshot updates an existing website snapshot
func (r *SnapshotRepository) UpdateSnapshot(snapshot *models.WebsiteSnapshot) error {
	componentsJSON, err := json.Marshal(snapshot.Components)
	if err != nil {
		return fmt.Errorf("failed to marshal components: %w", err)
	}

	stylesJSON, err := json.Marshal(snapshot.Styles)
	if err != nil {
		return fmt.Errorf("failed to marshal styles: %w", err)
	}

	layoutJSON, err := json.Marshal(snapshot.Layout)
	if err != nil {
		return fmt.Errorf("failed to marshal layout: %w", err)
	}

	customizationsJSON, err := json.Marshal(snapshot.Customizations)
	if err != nil {
		return fmt.Errorf("failed to marshal customizations: %w", err)
	}

	metadataJSON, err := json.Marshal(snapshot.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	snapshot.UpdatedAt = time.Now()

	query := `
		UPDATE website_snapshots 
		SET session_id = $1, version = $2, components = $3, styles = $4, 
		    layout = $5, customizations = $6, metadata = $7, prompt_id = $8, 
		    trigger_type = $9, updated_at = $10
		WHERE id = $11
	`

	_, err = r.db.Exec(query, 
		snapshot.SessionID, snapshot.Version, componentsJSON, stylesJSON, 
		layoutJSON, customizationsJSON, metadataJSON, snapshot.PromptID, 
		snapshot.TriggerType, snapshot.UpdatedAt, snapshot.ID,
	)

	return err
}

func (r *SnapshotRepository) CreateSnapshot(snapshot *models.WebsiteSnapshot) error {
	if snapshot.ID == uuid.Nil {
		snapshot.ID = uuid.New()
	}
	
	snapshot.CreatedAt = time.Now()
	snapshot.UpdatedAt = time.Now()

	query := `
		INSERT INTO website_snapshots (
			id, website_id, user_id, session_id, version,
			components, styles, layout, customizations, metadata,
			created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.db.Exec(query,
		snapshot.ID,
		snapshot.WebsiteID,
		snapshot.UserID,
		snapshot.SessionID,
		snapshot.Version,
		snapshot.Components,
		snapshot.Styles,
		snapshot.Layout,
		snapshot.Customizations,
		snapshot.Metadata,
		snapshot.CreatedAt,
		snapshot.UpdatedAt,
	)

	return err
}

func (r *SnapshotRepository) GetSnapshot(id uuid.UUID) (*models.WebsiteSnapshot, error) {
	snapshot := &models.WebsiteSnapshot{}
	
	query := `
		SELECT id, website_id, user_id, session_id, version,
			   components, styles, layout, customizations, metadata,
			   created_at, updated_at
		FROM website_snapshots
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&snapshot.ID,
		&snapshot.WebsiteID,
		&snapshot.UserID,
		&snapshot.SessionID,
		&snapshot.Version,
		&snapshot.Components,
		&snapshot.Styles,
		&snapshot.Layout,
		&snapshot.Customizations,
		&snapshot.Metadata,
		&snapshot.CreatedAt,
		&snapshot.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return snapshot, nil
}

func (r *SnapshotRepository) GetLatestSnapshot(websiteID string, userID uuid.UUID) (*models.WebsiteSnapshot, error) {
	snapshot := &models.WebsiteSnapshot{}
	
	query := `
		SELECT id, website_id, user_id, session_id, version,
			   components, styles, layout, customizations, metadata,
			   created_at, updated_at
		FROM website_snapshots
		WHERE website_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(query, websiteID, userID).Scan(
		&snapshot.ID,
		&snapshot.WebsiteID,
		&snapshot.UserID,
		&snapshot.SessionID,
		&snapshot.Version,
		&snapshot.Components,
		&snapshot.Styles,
		&snapshot.Layout,
		&snapshot.Customizations,
		&snapshot.Metadata,
		&snapshot.CreatedAt,
		&snapshot.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return snapshot, nil
}

func (r *SnapshotRepository) ListSnapshots(websiteID string, userID uuid.UUID, limit, offset int) ([]*models.WebsiteSnapshot, error) {
	query := `
		SELECT id, website_id, user_id, session_id, version,
			   components, styles, layout, customizations, metadata,
			   created_at, updated_at
		FROM website_snapshots
		WHERE website_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.Query(query, websiteID, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []*models.WebsiteSnapshot
	for rows.Next() {
		snapshot := &models.WebsiteSnapshot{}
		err := rows.Scan(
			&snapshot.ID,
			&snapshot.WebsiteID,
			&snapshot.UserID,
			&snapshot.SessionID,
			&snapshot.Version,
			&snapshot.Components,
			&snapshot.Styles,
			&snapshot.Layout,
			&snapshot.Customizations,
			&snapshot.Metadata,
			&snapshot.CreatedAt,
			&snapshot.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		snapshots = append(snapshots, snapshot)
	}

	return snapshots, rows.Err()
}

func (r *SnapshotRepository) DeleteSnapshot(id uuid.UUID) error {
	query := `DELETE FROM website_snapshots WHERE id = $1`
	_, err := r.db.Exec(query, id)
	return err
}

func (r *SnapshotRepository) GetSnapshotStats(websiteID string, userID uuid.UUID) (*SnapshotStats, error) {
	stats := &SnapshotStats{}
	
	query := `
		SELECT 
			COUNT(*) as total_snapshots,
			COALESCE(SUM(jsonb_array_length(components)), 0) as total_components,
			COALESCE(SUM(jsonb_array_length(customizations->'patches')), 0) as total_patches,
			MIN(created_at) as first_snapshot,
			MAX(created_at) as latest_snapshot,
			COALESCE(AVG((metadata->>'performance_metrics'->>'capture_time')::float), 0) as avg_capture_time
		FROM website_snapshots
		WHERE website_id = $1 AND user_id = $2
	`

	err := r.db.QueryRow(query, websiteID, userID).Scan(
		&stats.TotalSnapshots,
		&stats.TotalComponents,
		&stats.TotalPatches,
		&stats.FirstSnapshot,
		&stats.LatestSnapshot,
		&stats.AvgCaptureTime,
	)

	return stats, err
}

// ─────────────────────────────────────────────
// Snapshot Diff Operations
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CreateDiff(diff *models.SnapshotDiff) error {
	if diff.ID == uuid.Nil {
		diff.ID = uuid.New()
	}
	
	diff.CreatedAt = time.Now()

	query := `
		INSERT INTO snapshot_diffs (
			id, from_snapshot, to_snapshot, website_id, user_id,
			from_version, to_version, components, styles, layout, customizations,
			created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`

	_, err := r.db.Exec(query,
		diff.ID,
		diff.FromSnapshot,
		diff.ToSnapshot,
		diff.WebsiteID,
		diff.UserID,
		diff.FromVersion,
		diff.ToVersion,
		diff.Components,
		diff.Styles,
		diff.Layout,
		diff.Customizations,
		diff.CreatedAt,
	)

	return err
}

func (r *SnapshotRepository) GetDiff(id uuid.UUID) (*models.SnapshotDiff, error) {
	diff := &models.SnapshotDiff{}
	
	query := `
		SELECT id, from_snapshot, to_snapshot, website_id, user_id,
			   from_version, to_version, components, styles, layout, customizations,
			   created_at
		FROM snapshot_diffs
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&diff.ID,
		&diff.FromSnapshot,
		&diff.ToSnapshot,
		&diff.WebsiteID,
		&diff.UserID,
		&diff.FromVersion,
		&diff.ToVersion,
		&diff.Components,
		&diff.Styles,
		&diff.Layout,
		&diff.Customizations,
		&diff.CreatedAt,
	)

	return diff, err
}

func (r *SnapshotRepository) ListDiffs(websiteID string, userID uuid.UUID, limit, offset int) ([]*models.SnapshotDiff, error) {
	query := `
		SELECT id, from_snapshot, to_snapshot, website_id, user_id,
			   from_version, to_version, components, styles, layout, customizations,
			   created_at
		FROM snapshot_diffs
		WHERE website_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4
	`

	rows, err := r.db.Query(query, websiteID, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var diffs []*models.SnapshotDiff
	for rows.Next() {
		diff := &models.SnapshotDiff{}
		err := rows.Scan(
			&diff.ID,
			&diff.FromSnapshot,
			&diff.ToSnapshot,
			&diff.WebsiteID,
			&diff.UserID,
			&diff.FromVersion,
			&diff.ToVersion,
			&diff.Components,
			&diff.Styles,
			&diff.Layout,
			&diff.Customizations,
			&diff.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		diffs = append(diffs, diff)
	}

	return diffs, rows.Err()
}

// ─────────────────────────────────────────────
// Embedding Vector Operations
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CreateEmbedding(embedding *models.EmbeddingVector) error {
	if embedding.ID == uuid.Nil {
		embedding.ID = uuid.New()
	}
	
	embedding.CreatedAt = time.Now()

	// Convert vector to JSON for storage
	vectorJSON, err := json.Marshal(embedding.Vector)
	if err != nil {
		return fmt.Errorf("failed to marshal vector: %w", err)
	}

	query := `
		INSERT INTO embedding_vectors (
			id, snapshot_id, website_id, user_id, vector_type, target_id,
			vector, dimensions, model, token_count, content, metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`

	_, err = r.db.Exec(query,
		embedding.ID,
		embedding.SnapshotID,
		embedding.WebsiteID,
		embedding.UserID,
		embedding.VectorType,
		embedding.TargetID,
		vectorJSON,
		embedding.Dimensions,
		embedding.Model,
		embedding.TokenCount,
		embedding.Content,
		embedding.Metadata,
		embedding.CreatedAt,
	)

	return err
}

func (r *SnapshotRepository) GetEmbedding(id uuid.UUID) (*models.EmbeddingVector, error) {
	embedding := &models.EmbeddingVector{}
	var vectorJSON []byte
	
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE id = $1
	`

	err := r.db.QueryRow(query, id).Scan(
		&embedding.ID,
		&embedding.SnapshotID,
		&embedding.WebsiteID,
		&embedding.UserID,
		&embedding.VectorType,
		&embedding.TargetID,
		&vectorJSON,
		&embedding.Dimensions,
		&embedding.Model,
		&embedding.TokenCount,
		&embedding.Content,
		&embedding.Metadata,
		&embedding.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// Unmarshal vector JSON
	err = json.Unmarshal(vectorJSON, &embedding.Vector)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
	}

	return embedding, nil
}

func (r *SnapshotRepository) FindSimilarEmbeddings(websiteID string, userID uuid.UUID, targetVector models.Float32Array, vectorType string, limit int) ([]*models.EmbeddingVector, error) {
	// For now, we'll do a simple retrieval by type and let the application layer handle similarity
	// In production, you'd want to use pgvector with cosine similarity
	// The targetVector parameter is currently unused but kept for future similarity search implementation
	_ = targetVector // Explicitly mark as unused for now
	
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE website_id = $1 AND user_id = $2 AND vector_type = $3
		ORDER BY created_at DESC
		LIMIT $4
	`

	rows, err := r.db.Query(query, websiteID, userID, vectorType, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var embeddings []*models.EmbeddingVector
	for rows.Next() {
		embedding := &models.EmbeddingVector{}
		var vectorJSON []byte
		
		err := rows.Scan(
			&embedding.ID,
			&embedding.SnapshotID,
			&embedding.WebsiteID,
			&embedding.UserID,
			&embedding.VectorType,
			&embedding.TargetID,
			&vectorJSON,
			&embedding.Dimensions,
			&embedding.Model,
			&embedding.TokenCount,
			&embedding.Content,
			&embedding.Metadata,
			&embedding.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal vector JSON
		err = json.Unmarshal(vectorJSON, &embedding.Vector)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
		}

		embeddings = append(embeddings, embedding)
	}

	return embeddings, rows.Err()
}

func (r *SnapshotRepository) GetEmbeddingsBySnapshot(snapshotID uuid.UUID) ([]*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE snapshot_id = $1
		ORDER BY vector_type, target_id
	`

	rows, err := r.db.Query(query, snapshotID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var embeddings []*models.EmbeddingVector
	for rows.Next() {
		embedding := &models.EmbeddingVector{}
		var vectorJSON []byte
		
		err := rows.Scan(
			&embedding.ID,
			&embedding.SnapshotID,
			&embedding.WebsiteID,
			&embedding.UserID,
			&embedding.VectorType,
			&embedding.TargetID,
			&vectorJSON,
			&embedding.Dimensions,
			&embedding.Model,
			&embedding.TokenCount,
			&embedding.Content,
			&embedding.Metadata,
			&embedding.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal vector JSON
		err = json.Unmarshal(vectorJSON, &embedding.Vector)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
		}

		embeddings = append(embeddings, embedding)
	}

	return embeddings, rows.Err()
}

func (r *SnapshotRepository) DeleteEmbeddingsBySnapshot(snapshotID uuid.UUID) error {
	query := `DELETE FROM embedding_vectors WHERE snapshot_id = $1`
	_, err := r.db.Exec(query, snapshotID)
	return err
}

// ─────────────────────────────────────────────
// Website Context Operations
// ─────────────────────────────────────────────

func (r *SnapshotRepository) GetWebsiteContext(websiteID string, userID uuid.UUID) (*WebsiteContext, error) {
	context := &WebsiteContext{}
	
	query := `
		SELECT id, website_id, user_id, context_summary, component_map,
			   style_patterns, layout_structure, customization_intent,
			   last_snapshot_id, context_version, expires_at, created_at, updated_at
		FROM website_contexts
		WHERE website_id = $1 AND user_id = $2 
		AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
		ORDER BY updated_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(query, websiteID, userID).Scan(
		&context.ID,
		&context.WebsiteID,
		&context.UserID,
		&context.ContextSummary,
		&context.ComponentMap,
		&context.StylePatterns,
		&context.LayoutStructure,
		&context.CustomizationIntent,
		&context.LastSnapshotID,
		&context.ContextVersion,
		&context.ExpiresAt,
		&context.CreatedAt,
		&context.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return context, nil
}

func (r *SnapshotRepository) CreateOrUpdateWebsiteContext(context *WebsiteContext) error {
	if context.ID == uuid.Nil {
		context.ID = uuid.New()
	}
	
	now := time.Now()
	context.UpdatedAt = now
	
	if context.CreatedAt.IsZero() {
		context.CreatedAt = now
	}

	query := `
		INSERT INTO website_contexts (
			id, website_id, user_id, context_summary, component_map,
			style_patterns, layout_structure, customization_intent,
			last_snapshot_id, context_version, expires_at, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (website_id, user_id) DO UPDATE SET
			context_summary = EXCLUDED.context_summary,
			component_map = EXCLUDED.component_map,
			style_patterns = EXCLUDED.style_patterns,
			layout_structure = EXCLUDED.layout_structure,
			customization_intent = EXCLUDED.customization_intent,
			last_snapshot_id = EXCLUDED.last_snapshot_id,
			context_version = EXCLUDED.context_version,
			expires_at = EXCLUDED.expires_at,
			updated_at = EXCLUDED.updated_at
	`

	_, err := r.db.Exec(query,
		context.ID,
		context.WebsiteID,
		context.UserID,
		context.ContextSummary,
		context.ComponentMap,
		context.StylePatterns,
		context.LayoutStructure,
		context.CustomizationIntent,
		context.LastSnapshotID,
		context.ContextVersion,
		context.ExpiresAt,
		context.CreatedAt,
		context.UpdatedAt,
	)

	return err
}

// ─────────────────────────────────────────────
// Helper Types
// ─────────────────────────────────────────────

type SnapshotStats struct {
	TotalSnapshots   int                `json:"total_snapshots"`
	TotalComponents  int                `json:"total_components"`
	TotalPatches     int                `json:"total_patches"`
	FirstSnapshot    time.Time          `json:"first_snapshot"`
	LatestSnapshot   time.Time          `json:"latest_snapshot"`
	AvgCaptureTime   float64            `json:"avg_capture_time"`
}

type WebsiteContext struct {
	ID                   uuid.UUID   `json:"id" db:"id"`
	WebsiteID            string      `json:"website_id" db:"website_id"`
	UserID               uuid.UUID   `json:"user_id" db:"user_id"`
	ContextSummary       string      `json:"context_summary" db:"context_summary"`
	ComponentMap         string      `json:"component_map" db:"component_map"`         // JSONB as string
	StylePatterns        string      `json:"style_patterns" db:"style_patterns"`       // JSONB as string
	LayoutStructure      string      `json:"layout_structure" db:"layout_structure"`   // JSONB as string
	CustomizationIntent  string      `json:"customization_intent" db:"customization_intent"` // JSONB as string
	LastSnapshotID       *uuid.UUID  `json:"last_snapshot_id" db:"last_snapshot_id"`
	ContextVersion       string      `json:"context_version" db:"context_version"`
	ExpiresAt            *time.Time  `json:"expires_at" db:"expires_at"`
	CreatedAt            time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time   `json:"updated_at" db:"updated_at"`
}

// ─────────────────────────────────────────────
// User Management Functions
// ─────────────────────────────────────────────

func (r *SnapshotRepository) EnsureUserExists(userID uuid.UUID) error {
	// Check if user exists
	var exists bool
	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)", userID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check user existence: %w", err)
	}
	
	if exists {
		return nil // User already exists
	}
	
	// Create user with automatic values
	_, err = r.db.Exec(`
		INSERT INTO users (id, email, password_hash, name, role, verified, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
	`, userID, fmt.Sprintf("auto-%s@kuttl.xyz", userID.String()[:8]), "auto_generated", fmt.Sprintf("Auto User %s", userID.String()[:8]), "user")
	
	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}
	
	return nil
}

// ─────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CleanupExpiredContexts() (int64, error) {
	result, err := r.db.Exec(`
		DELETE FROM website_contexts 
		WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
	`)
	
	if err != nil {
		return 0, err
	}
	
	return result.RowsAffected()
}

func (r *SnapshotRepository) GetWebsiteContextSummary(websiteID string, userID uuid.UUID) (map[string]interface{}, error) {
	var result sql.NullString
	
	query := `SELECT get_website_context_summary($1, $2)`
	err := r.db.QueryRow(query, websiteID, userID).Scan(&result)
	
	if err != nil {
		return nil, err
	}
	
	if !result.Valid {
		return nil, fmt.Errorf("no context found")
	}
	
	var summary map[string]interface{}
	err = json.Unmarshal([]byte(result.String), &summary)
	return summary, err
}

// ─────────────────────────────────────────────
// Content Hashing for Deduplication
// ─────────────────────────────────────────────

// generateContentHashes generates content hashes for comparison
func (r *SnapshotRepository) generateContentHashes(snapshot *models.WebsiteSnapshot) (string, string, string, string, error) {
	componentsJSON, err := json.Marshal(snapshot.Components)
	if err != nil {
		return "", "", "", "", err
	}

	stylesJSON, err := json.Marshal(snapshot.Styles)
	if err != nil {
		return "", "", "", "", err
	}

	layoutJSON, err := json.Marshal(snapshot.Layout)
	if err != nil {
		return "", "", "", "", err
	}

	customizationsJSON, err := json.Marshal(snapshot.Customizations)
	if err != nil {
		return "", "", "", "", err
	}

	return r.hashContent(string(componentsJSON)),
		   r.hashContent(string(stylesJSON)),
		   r.hashContent(string(layoutJSON)),
		   r.hashContent(string(customizationsJSON)), nil
}

// compareContentHashes compares content hashes for duplicate detection
func (r *SnapshotRepository) compareContentHashes(componentsJSON, stylesJSON, layoutJSON, customizationsJSON,
	componentsHash, stylesHash, layoutHash, customizationsHash string) bool {
	
	return r.hashContent(componentsJSON) == componentsHash &&
		   r.hashContent(stylesJSON) == stylesHash &&
		   r.hashContent(layoutJSON) == layoutHash &&
		   r.hashContent(customizationsJSON) == customizationsHash
}

// hashContent creates a SHA256 hash of content for comparison
func (r *SnapshotRepository) hashContent(content string) string {
	hash := sha256.Sum256([]byte(content))
	return fmt.Sprintf("%x", hash)
}