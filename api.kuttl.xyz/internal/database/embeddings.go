package database

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type EmbeddingRepository struct {
	db *sqlx.DB
}

func NewEmbeddingRepository(db *sqlx.DB) *EmbeddingRepository {
	return &EmbeddingRepository{db: db}
}

func (r *EmbeddingRepository) Create(embedding *models.EmbeddingVector) error {
	query := `
		INSERT INTO embedding_vectors (
			snapshot_id, website_id, vector_type, target_id,
			vector, dimensions, model, token_count, content, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at
	`

	vectorJSON, err := json.Marshal(embedding.Vector)
	if err != nil {
		return fmt.Errorf("failed to marshal vector: %w", err)
	}

	metadataJSON, err := json.Marshal(embedding.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	return r.db.QueryRow(query,
		embedding.SnapshotID,
		embedding.WebsiteID,
		embedding.VectorType,
		embedding.TargetID,
		vectorJSON,
		embedding.Dimensions,
		embedding.Model,
		embedding.TokenCount,
		embedding.Content,
		metadataJSON,
	).Scan(&embedding.ID, &embedding.CreatedAt)
}

func (r *EmbeddingRepository) GetByID(id uuid.UUID) (*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE id = $1
	`
	embedding, err := r.scanOne(r.db.QueryRow(query, id))
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("embedding not found")
	}
	return embedding, err
}

// GetByWebsite returns the most recent embeddings for a website.
func (r *EmbeddingRepository) GetByWebsite(websiteID string, limit int) ([]*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE website_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`
	return r.scanMany(r.db.Query(query, websiteID, limit))
}

func (r *EmbeddingRepository) GetBySnapshot(snapshotID uuid.UUID) ([]*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, vector_type, target_id,
		       vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE snapshot_id = $1
		ORDER BY created_at DESC
	`
	return r.scanMany(r.db.Query(query, snapshotID))
}

func (r *EmbeddingRepository) FindSimilar(vector []float32, websiteID string, limit int) ([]*models.EmbeddingVector, error) {
	return r.GetByWebsite(websiteID, limit)
}

func (r *EmbeddingRepository) Delete(id uuid.UUID) error {
	result, err := r.db.Exec(`DELETE FROM embedding_vectors WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("failed to delete embedding: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("embedding not found")
	}
	return nil
}

func (r *EmbeddingRepository) DeleteBySnapshot(snapshotID uuid.UUID) error {
	_, err := r.db.Exec(`DELETE FROM embedding_vectors WHERE snapshot_id = $1`, snapshotID)
	return err
}

// ─── helpers ──────────────────────────────────────────────────────────────────

type rowScanner interface {
	Scan(dest ...interface{}) error
}

func (r *EmbeddingRepository) scanOne(row rowScanner) (*models.EmbeddingVector, error) {
	e := &models.EmbeddingVector{}
	var vectorJSON, metadataJSON []byte
	if err := row.Scan(
		&e.ID, &e.SnapshotID, &e.WebsiteID, &e.VectorType, &e.TargetID,
		&vectorJSON, &e.Dimensions, &e.Model, &e.TokenCount, &e.Content,
		&metadataJSON, &e.CreatedAt,
	); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(vectorJSON, &e.Vector); err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
	}
	if err := json.Unmarshal(metadataJSON, &e.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}
	return e, nil
}

func (r *EmbeddingRepository) scanMany(rows *sql.Rows, err error) ([]*models.EmbeddingVector, error) {
	if err != nil {
		return nil, fmt.Errorf("failed to query embeddings: %w", err)
	}
	defer rows.Close()

	var result []*models.EmbeddingVector
	for rows.Next() {
		e, err := r.scanOne(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan embedding: %w", err)
		}
		result = append(result, e)
	}
	return result, rows.Err()
}
