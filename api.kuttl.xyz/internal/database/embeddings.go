package database

import (
	"database/sql"
	"encoding/json"
	"fmt"

	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// ─────────────────────────────────────────────
// Embedding Repository
// ─────────────────────────────────────────────

type EmbeddingRepository struct {
	db *sqlx.DB
}

func NewEmbeddingRepository(db *sqlx.DB) *EmbeddingRepository {
	return &EmbeddingRepository{db: db}
}

// ─────────────────────────────────────────────
// Embedding CRUD Operations
// ─────────────────────────────────────────────

func (r *EmbeddingRepository) Create(embedding *models.EmbeddingVector) error {
	query := `
		INSERT INTO embedding_vectors (
			snapshot_id, website_id, user_id, vector_type, target_id,
			vector, dimensions, model, token_count, content, metadata
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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

	err = r.db.QueryRow(query,
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
		metadataJSON,
	).Scan(&embedding.ID, &embedding.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create embedding: %w", err)
	}

	return nil
}

func (r *EmbeddingRepository) GetByID(id uuid.UUID) (*models.EmbeddingVector, error) {
	embedding := &models.EmbeddingVector{}
	
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE id = $1
	`

	var vectorJSON, metadataJSON []byte
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
		&metadataJSON,
		&embedding.CreatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("embedding not found")
		}
		return nil, fmt.Errorf("failed to get embedding: %w", err)
	}

	// Unmarshal JSON fields
	if err := json.Unmarshal(vectorJSON, &embedding.Vector); err != nil {
		return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
	}

	if err := json.Unmarshal(metadataJSON, &embedding.Metadata); err != nil {
		return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
	}

	return embedding, nil
}

func (r *EmbeddingRepository) GetByWebsiteUser(websiteID string, userID uuid.UUID, limit int) ([]*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE website_id = $1 AND user_id = $2
		ORDER BY created_at DESC
		LIMIT $3
	`

	rows, err := r.db.Query(query, websiteID, userID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to query embeddings: %w", err)
	}
	defer rows.Close()

	var embeddings []*models.EmbeddingVector
	for rows.Next() {
		embedding := &models.EmbeddingVector{}
		var vectorJSON, metadataJSON []byte

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
			&metadataJSON,
			&embedding.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan embedding: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(vectorJSON, &embedding.Vector); err != nil {
			return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &embedding.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		embeddings = append(embeddings, embedding)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating embeddings: %w", err)
	}

	return embeddings, nil
}

func (r *EmbeddingRepository) GetBySnapshot(snapshotID uuid.UUID) ([]*models.EmbeddingVector, error) {
	query := `
		SELECT id, snapshot_id, website_id, user_id, vector_type, target_id,
			   vector, dimensions, model, token_count, content, metadata, created_at
		FROM embedding_vectors
		WHERE snapshot_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(query, snapshotID)
	if err != nil {
		return nil, fmt.Errorf("failed to query embeddings by snapshot: %w", err)
	}
	defer rows.Close()

	var embeddings []*models.EmbeddingVector
	for rows.Next() {
		embedding := &models.EmbeddingVector{}
		var vectorJSON, metadataJSON []byte

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
			&metadataJSON,
			&embedding.CreatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to scan embedding: %w", err)
		}

		// Unmarshal JSON fields
		if err := json.Unmarshal(vectorJSON, &embedding.Vector); err != nil {
			return nil, fmt.Errorf("failed to unmarshal vector: %w", err)
		}

		if err := json.Unmarshal(metadataJSON, &embedding.Metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}

		embeddings = append(embeddings, embedding)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating embeddings: %w", err)
	}

	return embeddings, nil
}

func (r *EmbeddingRepository) Delete(id uuid.UUID) error {
	query := `DELETE FROM embedding_vectors WHERE id = $1`
	
	result, err := r.db.Exec(query, id)
	if err != nil {
		return fmt.Errorf("failed to delete embedding: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("embedding not found")
	}

	return nil
}

func (r *EmbeddingRepository) DeleteBySnapshot(snapshotID uuid.UUID) error {
	query := `DELETE FROM embedding_vectors WHERE snapshot_id = $1`
	
	_, err := r.db.Exec(query, snapshotID)
	if err != nil {
		return fmt.Errorf("failed to delete embeddings by snapshot: %w", err)
	}

	return nil
}

// ─────────────────────────────────────────────
// Vector Similarity Search (Future Implementation)
// ─────────────────────────────────────────────

func (r *EmbeddingRepository) FindSimilar(vector []float32, websiteID string, userID uuid.UUID, limit int) ([]*models.EmbeddingVector, error) {
	// This would implement cosine similarity search
	// For now, return recent embeddings as a placeholder
	return r.GetByWebsiteUser(websiteID, userID, limit)
}