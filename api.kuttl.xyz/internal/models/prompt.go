package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ─────────────────────────────────────────────
// Customization Prompt
// ─────────────────────────────────────────────

type CustomizationPrompt struct {
	ID                 uuid.UUID `json:"id" db:"id"`
	UserID             uuid.UUID `json:"user_id" db:"user_id"`
	WebsiteID          string    `json:"website_id" db:"website_id"`
	WebsiteHash        *string   `json:"website_hash,omitempty" db:"website_hash"`
	BrowserClientID    *string   `json:"browser_client_id,omitempty" db:"browser_client_id"`
	PromptText         string    `json:"prompt_text" db:"prompt_text"`
	PromptType         string    `json:"prompt_type" db:"prompt_type"`
	SelectedElementUID *string   `json:"selected_element_uid,omitempty" db:"selected_element_uid"`
	PageURL            *string   `json:"page_url,omitempty" db:"page_url"`
	UserAgent          *string   `json:"user_agent,omitempty" db:"user_agent"`
	Success            bool      `json:"success" db:"success"`
	ErrorMessage       *string   `json:"error_message,omitempty" db:"error_message"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

// ─────────────────────────────────────────────
// Customization Prompt Result
// ─────────────────────────────────────────────

type CustomizationPromptResult struct {
	ID                 uuid.UUID   `json:"id" db:"id"`
	PromptID           uuid.UUID   `json:"prompt_id" db:"prompt_id"`
	WebsiteHash        *string     `json:"website_hash,omitempty" db:"website_hash"`
	BrowserClientID    *string     `json:"browser_client_id,omitempty" db:"browser_client_id"`
	AIProvider         string      `json:"ai_provider" db:"ai_provider"`
	AIModel            string      `json:"ai_model" db:"ai_model"`
	ResponseTimeMs     *int        `json:"response_time_ms,omitempty" db:"response_time_ms"`
	TokenCount         int         `json:"token_count" db:"token_count"`
	RawResponse        string      `json:"raw_response" db:"raw_response"`
	PatchesApplied     PatchArray  `json:"patches_applied" db:"patches_applied"`
	Warnings           StringArray `json:"warnings" db:"warnings"`
	CreatedAt          time.Time   `json:"created_at" db:"created_at"`
}

// ─────────────────────────────────────────────
// Custom DB types
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
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(b, p)
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
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(b, s)
}

// ─────────────────────────────────────────────
// Kept for backwards compat with older code paths
// ─────────────────────────────────────────────

// UserPrompt is an alias for CustomizationPrompt.
type UserPrompt = CustomizationPrompt

// PromptResult is an alias for CustomizationPromptResult.
type PromptResult = CustomizationPromptResult

// PromptMetadata is kept for any remaining callers.
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
	b, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(b, p)
}
