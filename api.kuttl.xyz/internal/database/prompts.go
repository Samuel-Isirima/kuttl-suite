package database

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"api.kuttl.xyz/internal/models"
)

// ─────────────────────────────────────────────
// Prompt Repository
// ─────────────────────────────────────────────

type PromptRepository struct {
	db *sqlx.DB
}

func NewPromptRepository(db *sqlx.DB) *PromptRepository {
	return &PromptRepository{db: db}
}

// ─────────────────────────────────────────────
// User Prompts
// ─────────────────────────────────────────────

func (r *PromptRepository) CreatePrompt(prompt *models.UserPrompt) error {
	query := `
		INSERT INTO user_prompts (
			id, user_id, website_id, session_id, prompt_text, prompt_type, 
			prompt_language, selected_element_uid, page_url, user_agent,
			snapshot_id, success, error_message, metadata
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
		)`

	_, err := r.db.Exec(query,
		prompt.ID, prompt.UserID, prompt.WebsiteID, prompt.SessionID,
		prompt.PromptText, prompt.PromptType, prompt.PromptLanguage,
		prompt.SelectedElementUID, prompt.PageURL, prompt.UserAgent,
		prompt.SnapshotID, prompt.Success, prompt.ErrorMessage, prompt.Metadata,
	)

	return err
}

func (r *PromptRepository) GetPrompt(promptID uuid.UUID) (*models.UserPrompt, error) {
	var prompt models.UserPrompt
	query := `
		SELECT id, user_id, website_id, session_id, prompt_text, prompt_type,
			   prompt_language, selected_element_uid, page_url, user_agent,
			   snapshot_id, success, error_message, metadata, created_at
		FROM user_prompts 
		WHERE id = $1`

	err := r.db.Get(&prompt, query, promptID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("prompt not found")
	}
	
	return &prompt, err
}

func (r *PromptRepository) GetUserPrompts(userID uuid.UUID, websiteID string, limit, offset int) ([]*models.UserPrompt, error) {
	var prompts []*models.UserPrompt
	query := `
		SELECT id, user_id, website_id, session_id, prompt_text, prompt_type,
			   prompt_language, selected_element_uid, page_url, user_agent,
			   snapshot_id, success, error_message, metadata, created_at
		FROM user_prompts 
		WHERE user_id = $1 AND website_id = $2
		ORDER BY created_at DESC
		LIMIT $3 OFFSET $4`

	err := r.db.Select(&prompts, query, userID, websiteID, limit, offset)
	return prompts, err
}

func (r *PromptRepository) UpdatePromptSnapshot(promptID, snapshotID uuid.UUID) error {
	query := `
		UPDATE user_prompts 
		SET snapshot_id = $1, success = true, error_message = NULL
		WHERE id = $2`

	_, err := r.db.Exec(query, snapshotID, promptID)
	return err
}

func (r *PromptRepository) UpdatePromptError(promptID uuid.UUID, errorMessage string) error {
	query := `
		UPDATE user_prompts 
		SET success = false, error_message = $1
		WHERE id = $2`

	_, err := r.db.Exec(query, errorMessage, promptID)
	return err
}

// ─────────────────────────────────────────────
// Prompt Results
// ─────────────────────────────────────────────

func (r *PromptRepository) CreatePromptResult(result *models.PromptResult) error {
	query := `
		INSERT INTO prompt_results (
			id, prompt_id, user_id, ai_provider, ai_model, response_time_ms,
			token_count, raw_response, patches_applied, warnings,
			confidence_score, user_satisfaction
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)`

	_, err := r.db.Exec(query,
		result.ID, result.PromptID, result.UserID,
		result.AIProvider, result.AIModel, result.ResponseTimeMs,
		result.TokenCount, result.RawResponse, result.PatchesApplied,
		result.Warnings, result.ConfidenceScore, result.UserSatisfaction,
	)

	return err
}

func (r *PromptRepository) GetPromptResults(promptID uuid.UUID) ([]*models.PromptResult, error) {
	var results []*models.PromptResult
	query := `
		SELECT id, prompt_id, user_id, ai_provider, ai_model, response_time_ms,
			   token_count, raw_response, patches_applied, warnings,
			   confidence_score, user_satisfaction, created_at
		FROM prompt_results 
		WHERE prompt_id = $1
		ORDER BY created_at DESC`

	err := r.db.Select(&results, query, promptID)
	return results, err
}

// ─────────────────────────────────────────────
// Analytics and Stats
// ─────────────────────────────────────────────

func (r *PromptRepository) GetPromptStats(userID uuid.UUID, websiteID string) (*PromptStats, error) {
	var stats PromptStats
	query := `
		SELECT 
			COUNT(*) as total_prompts,
			COUNT(CASE WHEN success = true THEN 1 END) as successful_prompts,
			COUNT(CASE WHEN success = false THEN 1 END) as failed_prompts,
			AVG(CASE WHEN pr.response_time_ms IS NOT NULL THEN pr.response_time_ms END) as avg_response_time,
			COUNT(DISTINCT session_id) as unique_sessions,
			COUNT(DISTINCT DATE(up.created_at)) as active_days
		FROM user_prompts up
		LEFT JOIN prompt_results pr ON up.id = pr.prompt_id
		WHERE up.user_id = $1 AND up.website_id = $2`

	err := r.db.Get(&stats, query, userID, websiteID)
	return &stats, err
}

type PromptStats struct {
	TotalPrompts      int     `json:"total_prompts" db:"total_prompts"`
	SuccessfulPrompts int     `json:"successful_prompts" db:"successful_prompts"`
	FailedPrompts     int     `json:"failed_prompts" db:"failed_prompts"`
	AvgResponseTime   *int    `json:"avg_response_time" db:"avg_response_time"`
	UniqueSessions    int     `json:"unique_sessions" db:"unique_sessions"`
	ActiveDays        int     `json:"active_days" db:"active_days"`
}

// ─────────────────────────────────────────────
// Cleanup utilities
// ─────────────────────────────────────────────

func (r *PromptRepository) DeleteOldPrompts(daysOld int) error {
	query := `
		DELETE FROM user_prompts 
		WHERE created_at < NOW() - INTERVAL '%d days'`

	_, err := r.db.Exec(fmt.Sprintf(query, daysOld))
	return err
}