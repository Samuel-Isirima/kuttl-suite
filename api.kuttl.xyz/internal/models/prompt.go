package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// User Prompts
// ─────────────────────────────────────────────

type UserPrompt struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	WebsiteID   string     `json:"website_id" db:"website_id"`
	SessionID   string     `json:"session_id" db:"session_id"`
	
	// Prompt content
	PromptText     string `json:"prompt_text" db:"prompt_text"`
	PromptType     string `json:"prompt_type" db:"prompt_type"`
	PromptLanguage string `json:"prompt_language" db:"prompt_language"`
	
	// Context
	SelectedElementUID *string `json:"selected_element_uid,omitempty" db:"selected_element_uid"`
	PageURL            *string `json:"page_url,omitempty" db:"page_url"`
	UserAgent          *string `json:"user_agent,omitempty" db:"user_agent"`
	
	// Results tracking
	SnapshotID   *uuid.UUID `json:"snapshot_id,omitempty" db:"snapshot_id"`
	Success      bool       `json:"success" db:"success"`
	ErrorMessage *string    `json:"error_message,omitempty" db:"error_message"`
	
	// Metadata
	Metadata  PromptMetadata  `json:"metadata" db:"metadata"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ─────────────────────────────────────────────
// Prompt Results
// ─────────────────────────────────────────────

type PromptResult struct {
	ID       uuid.UUID `json:"id" db:"id"`
	PromptID uuid.UUID `json:"prompt_id" db:"prompt_id"`
	UserID   uuid.UUID `json:"user_id" db:"user_id"`
	
	// AI response details
	AIProvider     string  `json:"ai_provider" db:"ai_provider"`
	AIModel        string  `json:"ai_model" db:"ai_model"`
	ResponseTimeMs *int    `json:"response_time_ms,omitempty" db:"response_time_ms"`
	TokenCount     int     `json:"token_count" db:"token_count"`
	
	// Generated content
	RawResponse     string          `json:"raw_response" db:"raw_response"`
	PatchesApplied  PatchArray      `json:"patches_applied" db:"patches_applied"`
	Warnings        StringArray     `json:"warnings" db:"warnings"`
	
	// Quality metrics
	ConfidenceScore    *float64 `json:"confidence_score,omitempty" db:"confidence_score"`
	UserSatisfaction   *int     `json:"user_satisfaction,omitempty" db:"user_satisfaction"`
	
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// ─────────────────────────────────────────────
// Custom types for database storage
// ─────────────────────────────────────────────

type PatchArray []map[string]interface{}

func (p PatchArray) Value() (driver.Value, error) {
	if p == nil {
		return json.Marshal([]map[string]interface{}{})
	}
	return json.Marshal(p)
}

func (p *PatchArray) Scan(value interface{}) error {
	if value == nil {
		*p = []map[string]interface{}{}
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, p)
}

type StringArray []string

func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return json.Marshal([]string{})
	}
	return json.Marshal(s)
}

func (s *StringArray) Scan(value interface{}) error {
	if value == nil {
		*s = []string{}
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, s)
}

type PromptMetadata map[string]interface{}

func (p PromptMetadata) Value() (driver.Value, error) {
	if p == nil {
		return json.Marshal(map[string]interface{}{})
	}
	return json.Marshal(p)
}

func (p *PromptMetadata) Scan(value interface{}) error {
	if value == nil {
		*p = make(map[string]interface{})
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, p)
}

// ─────────────────────────────────────────────
// Request/Response types for API
// ─────────────────────────────────────────────

type CreatePromptRequest struct {
	PromptText         string                 `json:"prompt_text"`
	PromptType         string                 `json:"prompt_type,omitempty"`
	SelectedElementUID string                 `json:"selected_element_uid,omitempty"`
	PageURL            string                 `json:"page_url,omitempty"`
	UserAgent          string                 `json:"user_agent,omitempty"`
	Metadata           map[string]interface{} `json:"metadata,omitempty"`
}

type CreatePromptResponse struct {
	PromptID uuid.UUID `json:"prompt_id"`
}

type PromptResultRequest struct {
	AIProvider     string                   `json:"ai_provider"`
	AIModel        string                   `json:"ai_model"`
	ResponseTimeMs int                      `json:"response_time_ms,omitempty"`
	TokenCount     int                      `json:"token_count,omitempty"`
	RawResponse    string                   `json:"raw_response"`
	PatchesApplied []map[string]interface{} `json:"patches_applied,omitempty"`
	Warnings       []string                 `json:"warnings,omitempty"`
	Success        bool                     `json:"success"`
	ErrorMessage   string                   `json:"error_message,omitempty"`
}

// ─────────────────────────────────────────────
// Snapshot creation with prompt context
// ─────────────────────────────────────────────

type CreateSnapshotWithPromptRequest struct {
	// Snapshot data (existing fields)
	WebsiteID      string                 `json:"website_id"`
	SessionID      string                 `json:"session_id"`
	Components     []map[string]interface{} `json:"components"`
	Styles         map[string]interface{}   `json:"styles"`
	Layout         map[string]interface{}   `json:"layout"`
	Customizations map[string]interface{}   `json:"customizations"`
	Metadata       map[string]interface{}   `json:"metadata"`
	
	// Prompt context (new fields)
	PromptText         string `json:"prompt_text,omitempty"`
	SelectedElementUID string `json:"selected_element_uid,omitempty"`
	TriggerType        string `json:"trigger_type"` // 'manual', 'ai_prompt', 'auto_sync'
}