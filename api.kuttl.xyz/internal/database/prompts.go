package database

import (
	"database/sql"
	"fmt"

	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type PromptRepository struct {
	db *sqlx.DB
}

func NewPromptRepository(db *sqlx.DB) *PromptRepository {
	return &PromptRepository{db: db}
}

// ─────────────────────────────────────────────
// Customization Prompts
// ─────────────────────────────────────────────

func (r *PromptRepository) CreatePrompt(prompt *models.CustomizationPrompt) error {
	_, err := r.db.Exec(`
		INSERT INTO customization_prompts (
			id, user_id, website_id, website_hash, browser_client_id,
			prompt_text, prompt_type,
			selected_element_uid, page_url, user_agent,
			success, error_message
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
	`,
		prompt.ID, prompt.UserID, prompt.WebsiteID,
		prompt.WebsiteHash, prompt.BrowserClientID,
		prompt.PromptText, prompt.PromptType,
		prompt.SelectedElementUID, prompt.PageURL, prompt.UserAgent,
		prompt.Success, prompt.ErrorMessage,
	)
	return err
}

func (r *PromptRepository) GetPrompt(promptID uuid.UUID) (*models.CustomizationPrompt, error) {
	var prompt models.CustomizationPrompt
	err := r.db.Get(&prompt, `
		SELECT id, user_id, website_id, website_hash, browser_client_id,
		       prompt_text, prompt_type,
		       selected_element_uid, page_url, user_agent,
		       success, error_message, created_at
		FROM customization_prompts
		WHERE id = $1
	`, promptID)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("prompt not found")
	}
	return &prompt, err
}

func (r *PromptRepository) GetPromptsByWebsite(websiteID string, limit, offset int) ([]*models.CustomizationPrompt, error) {
	var prompts []*models.CustomizationPrompt
	err := r.db.Select(&prompts, `
		SELECT id, user_id, website_id, website_hash, browser_client_id,
		       prompt_text, prompt_type,
		       selected_element_uid, page_url, user_agent,
		       success, error_message, created_at
		FROM customization_prompts
		WHERE website_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`, websiteID, limit, offset)
	return prompts, err
}

func (r *PromptRepository) UpdatePromptError(promptID uuid.UUID, errorMessage string) error {
	_, err := r.db.Exec(`
		UPDATE customization_prompts
		SET success = false, error_message = $1
		WHERE id = $2
	`, errorMessage, promptID)
	return err
}

func (r *PromptRepository) DeleteOldPrompts(daysOld int) error {
	_, err := r.db.Exec(fmt.Sprintf(`
		DELETE FROM customization_prompts
		WHERE created_at < NOW() - INTERVAL '%d days'
	`, daysOld))
	return err
}

// ─────────────────────────────────────────────
// Customization Prompt Results
// ─────────────────────────────────────────────

func (r *PromptRepository) CreatePromptResult(result *models.CustomizationPromptResult) error {
	_, err := r.db.Exec(`
		INSERT INTO customization_prompt_results (
			id, prompt_id, website_hash, browser_client_id,
			ai_provider, ai_model,
			response_time_ms, token_count, raw_response,
			patches_applied, warnings
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		result.ID, result.PromptID,
		result.WebsiteHash, result.BrowserClientID,
		result.AIProvider, result.AIModel,
		result.ResponseTimeMs, result.TokenCount, result.RawResponse,
		result.PatchesApplied, result.Warnings,
	)
	return err
}

func (r *PromptRepository) GetPromptResults(promptID uuid.UUID) ([]*models.CustomizationPromptResult, error) {
	var results []*models.CustomizationPromptResult
	err := r.db.Select(&results, `
		SELECT id, prompt_id, website_hash, browser_client_id,
		       ai_provider, ai_model,
		       response_time_ms, token_count, raw_response,
		       patches_applied, warnings, created_at
		FROM customization_prompt_results
		WHERE prompt_id = $1
		ORDER BY created_at DESC
	`, promptID)
	return results, err
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────

type PromptStats struct {
	TotalPrompts      int  `json:"total_prompts" db:"total_prompts"`
	SuccessfulPrompts int  `json:"successful_prompts" db:"successful_prompts"`
	FailedPrompts     int  `json:"failed_prompts" db:"failed_prompts"`
	AvgResponseTime   *int `json:"avg_response_time" db:"avg_response_time"`
}

func (r *PromptRepository) GetPromptStats(websiteID string) (*PromptStats, error) {
	var stats PromptStats
	err := r.db.Get(&stats, `
		SELECT
			COUNT(*)                                         AS total_prompts,
			COUNT(CASE WHEN cp.success = true  THEN 1 END)  AS successful_prompts,
			COUNT(CASE WHEN cp.success = false THEN 1 END)  AS failed_prompts,
			AVG(cpr.response_time_ms)::INTEGER               AS avg_response_time
		FROM customization_prompts cp
		LEFT JOIN customization_prompt_results cpr ON cpr.prompt_id = cp.id
		WHERE cp.website_id = $1
	`, websiteID)
	return &stats, err
}
