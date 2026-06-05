package database

import (
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
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
// Browser Client Operations
// ─────────────────────────────────────────────

// UpsertBrowserClient creates a browser_client row on first visit and updates last_seen_at on return.
func (r *SnapshotRepository) UpsertBrowserClient(fingerprint, websiteHash string) error {
	_, err := r.db.Exec(`
		INSERT INTO browser_clients (id, website_hash, first_seen_at, last_seen_at)
		VALUES ($1, $2, NOW(), NOW())
		ON CONFLICT (id) DO UPDATE SET last_seen_at = NOW()
	`, fingerprint, websiteHash)
	return err
}

// ─────────────────────────────────────────────
// Website Snapshot CRUD
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CreateSnapshot(snapshot *models.WebsiteSnapshot) error {
	if snapshot.ID == uuid.Nil {
		snapshot.ID = uuid.New()
	}
	snapshot.CreatedAt = time.Now()
	snapshot.UpdatedAt = time.Now()

	_, err := r.db.Exec(`
		INSERT INTO website_snapshots (
			id, website_id, browser_client_id, version,
			components, styles, layout, customizations, metadata,
			prompt_id, trigger_type, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
	`,
		snapshot.ID,
		snapshot.WebsiteID,
		snapshot.BrowserClientID,
		snapshot.Version,
		snapshot.Components,
		snapshot.Styles,
		snapshot.Layout,
		snapshot.Customizations,
		snapshot.Metadata,
		snapshot.PromptID,
		snapshot.TriggerType,
		snapshot.CreatedAt,
		snapshot.UpdatedAt,
	)
	return err
}

func (r *SnapshotRepository) GetSnapshot(id uuid.UUID) (*models.WebsiteSnapshot, error) {
	snapshot := &models.WebsiteSnapshot{}
	err := r.db.QueryRow(`
		SELECT id, website_id, browser_client_id, version,
		       components, styles, layout, customizations, metadata,
		       prompt_id, trigger_type, created_at, updated_at
		FROM website_snapshots WHERE id = $1
	`, id).Scan(
		&snapshot.ID,
		&snapshot.WebsiteID,
		&snapshot.BrowserClientID,
		&snapshot.Version,
		&snapshot.Components,
		&snapshot.Styles,
		&snapshot.Layout,
		&snapshot.Customizations,
		&snapshot.Metadata,
		&snapshot.PromptID,
		&snapshot.TriggerType,
		&snapshot.CreatedAt,
		&snapshot.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return snapshot, nil
}

func (r *SnapshotRepository) GetLatestSnapshot(websiteID string) (*models.WebsiteSnapshot, error) {
	snapshot := &models.WebsiteSnapshot{}
	err := r.db.QueryRow(`
		SELECT id, website_id, browser_client_id, version,
		       components, styles, layout, customizations, metadata,
		       prompt_id, trigger_type, created_at, updated_at
		FROM website_snapshots
		WHERE website_id = $1
		ORDER BY created_at DESC LIMIT 1
	`, websiteID).Scan(
		&snapshot.ID,
		&snapshot.WebsiteID,
		&snapshot.BrowserClientID,
		&snapshot.Version,
		&snapshot.Components,
		&snapshot.Styles,
		&snapshot.Layout,
		&snapshot.Customizations,
		&snapshot.Metadata,
		&snapshot.PromptID,
		&snapshot.TriggerType,
		&snapshot.CreatedAt,
		&snapshot.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return snapshot, nil
}

// GetLatestSnapshotForWebsite is an alias kept for callers that need the latest snapshot by website_id.
func (r *SnapshotRepository) GetLatestSnapshotForWebsite(websiteID string) (*models.WebsiteSnapshot, error) {
	snapshot, err := r.GetLatestSnapshot(websiteID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return snapshot, err
}

func (r *SnapshotRepository) ListSnapshots(websiteID string, limit, offset int) ([]*models.WebsiteSnapshot, error) {
	rows, err := r.db.Query(`
		SELECT id, website_id, browser_client_id, version,
		       components, styles, layout, customizations, metadata,
		       prompt_id, trigger_type, created_at, updated_at
		FROM website_snapshots
		WHERE website_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, websiteID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var snapshots []*models.WebsiteSnapshot
	for rows.Next() {
		s := &models.WebsiteSnapshot{}
		if err := rows.Scan(
			&s.ID, &s.WebsiteID, &s.BrowserClientID, &s.Version,
			&s.Components, &s.Styles, &s.Layout, &s.Customizations, &s.Metadata,
			&s.PromptID, &s.TriggerType, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, err
		}
		snapshots = append(snapshots, s)
	}
	return snapshots, rows.Err()
}

func (r *SnapshotRepository) UpdateSnapshot(snapshot *models.WebsiteSnapshot) error {
	componentsJSON, _ := json.Marshal(snapshot.Components)
	stylesJSON, _ := json.Marshal(snapshot.Styles)
	layoutJSON, _ := json.Marshal(snapshot.Layout)
	customizationsJSON, _ := json.Marshal(snapshot.Customizations)
	metadataJSON, _ := json.Marshal(snapshot.Metadata)
	snapshot.UpdatedAt = time.Now()

	_, err := r.db.Exec(`
		UPDATE website_snapshots
		SET version = $1, components = $2, styles = $3, layout = $4,
		    customizations = $5, metadata = $6, prompt_id = $7,
		    trigger_type = $8, updated_at = $9
		WHERE id = $10
	`,
		snapshot.Version, componentsJSON, stylesJSON, layoutJSON,
		customizationsJSON, metadataJSON, snapshot.PromptID,
		snapshot.TriggerType, snapshot.UpdatedAt, snapshot.ID,
	)
	return err
}

func (r *SnapshotRepository) DeleteSnapshot(id uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM website_snapshots WHERE id = $1`, id)
	return err
}

func (r *SnapshotRepository) GetSnapshotStats(websiteID string) (*SnapshotStats, error) {
	stats := &SnapshotStats{}
	err := r.db.QueryRow(`
		SELECT
			COUNT(*),
			COALESCE(SUM(jsonb_array_length(components)), 0),
			COALESCE(SUM(jsonb_array_length(customizations->'patches')), 0),
			MIN(created_at),
			MAX(created_at),
			0
		FROM website_snapshots
		WHERE website_id = $1
	`, websiteID).Scan(
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
// Duplicate Detection
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CheckSnapshotDuplicate(websiteID string, snapshot *models.WebsiteSnapshot) (*uuid.UUID, error) {
	componentsHash, stylesHash, layoutHash, customizationsHash, err := r.generateContentHashes(snapshot)
	if err != nil {
		return nil, err
	}

	rows, err := r.db.Query(`
		SELECT id, components, styles, layout, customizations
		FROM website_snapshots
		WHERE website_id = $1
		AND created_at > NOW() - INTERVAL '24 hours'
		ORDER BY created_at DESC LIMIT 10
	`, websiteID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var id uuid.UUID
		var comp, sty, lay, cust string
		if err := rows.Scan(&id, &comp, &sty, &lay, &cust); err != nil {
			continue
		}
		if r.compareContentHashes(comp, sty, lay, cust, componentsHash, stylesHash, layoutHash, customizationsHash) {
			return &id, nil
		}
	}
	return nil, nil
}

// ─────────────────────────────────────────────
// Snapshot Existence Check
// ─────────────────────────────────────────────

func (r *SnapshotRepository) SnapshotExistsForWebsite(websiteID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM website_snapshots WHERE website_id = $1 LIMIT 1)`,
		websiteID,
	).Scan(&exists)
	return exists, err
}

// ─────────────────────────────────────────────
// Snapshot Diff Operations  (snapshot_diffs still carries user_id)
// ─────────────────────────────────────────────

func (r *SnapshotRepository) CreateDiff(diff *models.SnapshotDiff) error {
	if diff.ID == uuid.Nil {
		diff.ID = uuid.New()
	}
	diff.CreatedAt = time.Now()

	_, err := r.db.Exec(`
		INSERT INTO snapshot_diffs (
			id, from_snapshot, to_snapshot, website_id, user_id,
			from_version, to_version, components, styles, layout, customizations, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		diff.ID, diff.FromSnapshot, diff.ToSnapshot, diff.WebsiteID, diff.UserID,
		diff.FromVersion, diff.ToVersion, diff.Components, diff.Styles, diff.Layout,
		diff.Customizations, diff.CreatedAt,
	)
	return err
}

func (r *SnapshotRepository) GetDiff(id uuid.UUID) (*models.SnapshotDiff, error) {
	diff := &models.SnapshotDiff{}
	err := r.db.QueryRow(`
		SELECT id, from_snapshot, to_snapshot, website_id, user_id,
		       from_version, to_version, components, styles, layout, customizations, created_at
		FROM snapshot_diffs WHERE id = $1
	`, id).Scan(
		&diff.ID, &diff.FromSnapshot, &diff.ToSnapshot, &diff.WebsiteID, &diff.UserID,
		&diff.FromVersion, &diff.ToVersion, &diff.Components, &diff.Styles, &diff.Layout,
		&diff.Customizations, &diff.CreatedAt,
	)
	return diff, err
}

func (r *SnapshotRepository) ListDiffs(websiteID string, userID uuid.UUID, limit, offset int) ([]*models.SnapshotDiff, error) {
	rows, err := r.db.Query(`
		SELECT id, from_snapshot, to_snapshot, website_id, user_id,
		       from_version, to_version, components, styles, layout, customizations, created_at
		FROM snapshot_diffs
		WHERE website_id = $1 AND user_id = $2
		ORDER BY created_at DESC LIMIT $3 OFFSET $4
	`, websiteID, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var diffs []*models.SnapshotDiff
	for rows.Next() {
		d := &models.SnapshotDiff{}
		if err := rows.Scan(
			&d.ID, &d.FromSnapshot, &d.ToSnapshot, &d.WebsiteID, &d.UserID,
			&d.FromVersion, &d.ToVersion, &d.Components, &d.Styles, &d.Layout,
			&d.Customizations, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		diffs = append(diffs, d)
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

	vectorJSON, err := json.Marshal(embedding.Vector)
	if err != nil {
		return fmt.Errorf("failed to marshal vector: %w", err)
	}

	_, err = r.db.Exec(`
		INSERT INTO embedding_vectors (
			id, snapshot_id, website_id, vector_type, target_id,
			vector, dimensions, model, token_count, content, metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		embedding.ID, embedding.SnapshotID, embedding.WebsiteID,
		embedding.VectorType, embedding.TargetID,
		vectorJSON, embedding.Dimensions, embedding.Model,
		embedding.TokenCount, embedding.Content, embedding.Metadata, embedding.CreatedAt,
	)
	return err
}

func (r *SnapshotRepository) GetEmbedding(id uuid.UUID) (*models.EmbeddingVector, error) {
	e := &models.EmbeddingVector{}
	var vectorJSON []byte
	err := r.db.QueryRow(`
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors WHERE id = $1
	`, id).Scan(
		&e.ID, &e.SnapshotID, &e.WebsiteID, &e.VectorType, &e.TargetID,
		&vectorJSON, &e.Dimensions, &e.Model, &e.TokenCount, &e.Content,
		&e.Metadata, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(vectorJSON, &e.Vector); err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
	}
	return e, nil
}

func (r *SnapshotRepository) FindSimilarEmbeddings(websiteID string, targetVector models.Float32Array, vectorType string, limit int) ([]*models.EmbeddingVector, error) {
	_ = targetVector
	rows, err := r.db.Query(`
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE website_id = $1 AND vector_type = $2
		ORDER BY created_at DESC LIMIT $3
	`, websiteID, vectorType, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanEmbeddings(rows)
}

func (r *SnapshotRepository) GetEmbeddingsBySnapshot(snapshotID uuid.UUID) ([]*models.EmbeddingVector, error) {
	rows, err := r.db.Query(`
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE snapshot_id = $1
		ORDER BY vector_type, target_id
	`, snapshotID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return r.scanEmbeddings(rows)
}

func (r *SnapshotRepository) DeleteEmbeddingsBySnapshot(snapshotID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM embedding_vectors WHERE snapshot_id = $1`, snapshotID)
	return err
}

func (r *SnapshotRepository) scanEmbeddings(rows *sql.Rows) ([]*models.EmbeddingVector, error) {
	var result []*models.EmbeddingVector
	for rows.Next() {
		e := &models.EmbeddingVector{}
		var vectorJSON []byte
		if err := rows.Scan(
			&e.ID, &e.SnapshotID, &e.WebsiteID, &e.VectorType, &e.TargetID,
			&vectorJSON, &e.Dimensions, &e.Model, &e.TokenCount, &e.Content,
			&e.Metadata, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(vectorJSON, &e.Vector); err != nil {
			return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
		}
		result = append(result, e)
	}
	return result, rows.Err()
}

// ─────────────────────────────────────────────
// Helper Types
// ─────────────────────────────────────────────

type SnapshotStats struct {
	TotalSnapshots  int       `json:"total_snapshots"`
	TotalComponents int       `json:"total_components"`
	TotalPatches    int       `json:"total_patches"`
	FirstSnapshot   time.Time `json:"first_snapshot"`
	LatestSnapshot  time.Time `json:"latest_snapshot"`
	AvgCaptureTime  float64   `json:"avg_capture_time"`
}

// ─────────────────────────────────────────────
// Content Hashing for Deduplication
// ─────────────────────────────────────────────

func (r *SnapshotRepository) generateContentHashes(snapshot *models.WebsiteSnapshot) (string, string, string, string, error) {
	c, err := json.Marshal(snapshot.Components)
	if err != nil {
		return "", "", "", "", err
	}
	s, err := json.Marshal(snapshot.Styles)
	if err != nil {
		return "", "", "", "", err
	}
	l, err := json.Marshal(snapshot.Layout)
	if err != nil {
		return "", "", "", "", err
	}
	cu, err := json.Marshal(snapshot.Customizations)
	if err != nil {
		return "", "", "", "", err
	}
	return r.hashContent(string(c)), r.hashContent(string(s)), r.hashContent(string(l)), r.hashContent(string(cu)), nil
}

func (r *SnapshotRepository) compareContentHashes(comp, sty, lay, cust, cHash, sHash, lHash, cuHash string) bool {
	return r.hashContent(comp) == cHash &&
		r.hashContent(sty) == sHash &&
		r.hashContent(lay) == lHash &&
		r.hashContent(cust) == cuHash
}

func (r *SnapshotRepository) hashContent(content string) string {
	hash := sha256.Sum256([]byte(content))
	return fmt.Sprintf("%x", hash)
}
