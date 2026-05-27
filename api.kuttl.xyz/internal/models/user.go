package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Email     string    `json:"email" db:"email"`
	Password  string    `json:"-" db:"password_hash"` // Never serialize password
	Name      string    `json:"name" db:"name"`
	Role      string    `json:"role" db:"role"` // "admin", "user"
	Verified  bool      `json:"verified" db:"verified"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type APIToken struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	UserID      uuid.UUID  `json:"user_id" db:"user_id"`
	Name        string     `json:"name" db:"name"`
	Token       string     `json:"token" db:"token_hash"`
	TokenPrefix string     `json:"token_prefix" db:"token_prefix"` // First 8 chars for display
	LastUsed    *time.Time `json:"last_used" db:"last_used"`
	ExpiresAt   *time.Time `json:"expires_at" db:"expires_at"`
	IsActive    bool       `json:"is_active" db:"is_active"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

type Session struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	Token     string    `json:"-" db:"token_hash"` // JWT token hash
	IPAddress string    `json:"ip_address" db:"ip_address"`
	UserAgent string    `json:"user_agent" db:"user_agent"`
	ExpiresAt time.Time `json:"expires_at" db:"expires_at"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// UserRole constants
const (
	RoleAdmin = "admin"
	RoleUser  = "user"
)

// IsAdmin checks if user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsValidRole checks if the role is valid
func IsValidRole(role string) bool {
	return role == RoleAdmin || role == RoleUser
}

// APITokenCreateRequest represents the request to create a new API token
type APITokenCreateRequest struct {
	Name      string     `json:"name" validate:"required,min=1,max=100"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// APITokenResponse represents the response when creating/listing API tokens
type APITokenResponse struct {
	ID          uuid.UUID  `json:"id"`
	Name        string     `json:"name"`
	TokenPrefix string     `json:"token_prefix"`
	LastUsed    *time.Time `json:"last_used"`
	ExpiresAt   *time.Time `json:"expires_at"`
	IsActive    bool       `json:"is_active"`
	CreatedAt   time.Time  `json:"created_at"`
}

// APITokenCreateResponse includes the full token (only sent once)
type APITokenCreateResponse struct {
	APITokenResponse
	Token string `json:"token"`
}

// APICall represents an API call log entry
type APICall struct {
	ID                uuid.UUID `json:"id" db:"id"`
	UserID            uuid.UUID `json:"user_id" db:"user_id"`
	APIKeyID          uuid.UUID `json:"api_key_id" db:"api_key_id"`
	APIKeyName        string    `json:"api_key_name" db:"api_key_name"`
	IPAddress         string    `json:"ip_address" db:"ip_address"`
	Domain            string    `json:"domain" db:"domain"`
	Referrer          string    `json:"referrer" db:"referrer"`
	Action            string    `json:"action" db:"action"`
	Endpoint          string    `json:"endpoint" db:"endpoint"`
	Method            string    `json:"method" db:"method"`
	StatusCode        int       `json:"status_code" db:"status_code"`
	ResponseTimeMS    int       `json:"response_time_ms" db:"response_time_ms"`
	UserAgent         string    `json:"user_agent" db:"user_agent"`
	DeviceType        string    `json:"device_type" db:"device_type"`
	BrowserFingerprint string   `json:"browser_fingerprint" db:"browser_fingerprint"`
	PromptText        *string   `json:"prompt_text,omitempty" db:"prompt_text"`
	PromptResponse    *string   `json:"prompt_response,omitempty" db:"prompt_response"`
	AIProvider        *string   `json:"ai_provider,omitempty" db:"ai_provider"`
	AIModel           *string   `json:"ai_model,omitempty" db:"ai_model"`
	PatchesCount      int       `json:"patches_count" db:"patches_count"`
	SuccessStatus     *string   `json:"success_status,omitempty" db:"success_status"`
	Timestamp         time.Time `json:"timestamp" db:"timestamp"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

// UsageStats represents usage statistics
type UsageStats struct {
	TotalCalls      int     `json:"total_calls"`
	CallsToday      int     `json:"calls_today"`
	CallsThisWeek   int     `json:"calls_this_week"`
	CallsThisMonth  int     `json:"calls_this_month"`
	AvgResponseTime int     `json:"avg_response_time"`
	SuccessRate     float64 `json:"success_rate"`
}

// UsageFilters represents filters for usage queries
type UsageFilters struct {
	Action    string
	TimeRange string
	Domain    string
	Limit     int
	Offset    int
}