package usage

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
)

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{
		db: db,
	}
}

// GetAPICallsForUser returns API calls for a specific user with filtering
func (s *Service) GetAPICallsForUser(userID string, filters models.UsageFilters) ([]models.APICall, error) {
	// First check if the api_calls table exists and has fingerprint column
	var tableExists bool
	var fingerprintColumnExists bool
	
	err := s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'api_calls'
		)
	`).Scan(&tableExists)
	if err != nil {
		return nil, fmt.Errorf("failed to check if api_calls table exists: %w", err)
	}
	
	if !tableExists {
		fmt.Printf("DEBUG: api_calls table does not exist, returning empty calls\n")
		return []models.APICall{}, nil
	}

	// Check if browser_fingerprint column exists
	err = s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_name = 'api_calls' AND column_name = 'browser_fingerprint'
		)
	`).Scan(&fingerprintColumnExists)
	if err != nil {
		fmt.Printf("DEBUG: failed to check fingerprint column: %v\n", err)
		fingerprintColumnExists = false
	}
	
	fmt.Printf("DEBUG: fingerprint column exists: %v\n", fingerprintColumnExists)

	// Check for new prompt tracking columns
	var promptColumnsExist bool
	err = s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_name = 'api_calls' AND column_name = 'prompt_text'
		)
	`).Scan(&promptColumnsExist)
	if err != nil {
		fmt.Printf("DEBUG: failed to check prompt columns: %v\n", err)
		promptColumnsExist = false
	}

	var query string
	if fingerprintColumnExists && promptColumnsExist {
		query = `
			SELECT 
				ac.id, ac.user_id, ac.api_key_id, ak.name as api_key_name,
				ac.ip_address, ac.domain, ac.referrer, ac.action, ac.endpoint, ac.method,
				ac.status_code, ac.response_time_ms, ac.user_agent, ac.device_type, ac.browser_fingerprint,
				ac.prompt_text, ac.prompt_response, ac.ai_provider, ac.ai_model, ac.patches_count, ac.success_status,
				ac.timestamp, ac.created_at
			FROM api_calls ac
			JOIN api_tokens ak ON ac.api_key_id = ak.id
			WHERE ac.user_id = $1
		`
	} else if fingerprintColumnExists {
		query = `
			SELECT 
				ac.id, ac.user_id, ac.api_key_id, ak.name as api_key_name,
				ac.ip_address, ac.domain, ac.referrer, ac.action, ac.endpoint, ac.method,
				ac.status_code, ac.response_time_ms, ac.user_agent, ac.device_type, ac.browser_fingerprint,
				NULL, NULL, NULL, NULL, 0, NULL,
				ac.timestamp, ac.created_at
			FROM api_calls ac
			JOIN api_tokens ak ON ac.api_key_id = ak.id
			WHERE ac.user_id = $1
		`
	} else if promptColumnsExist {
		query = `
			SELECT 
				ac.id, ac.user_id, ac.api_key_id, ak.name as api_key_name,
				ac.ip_address, ac.domain, ac.referrer, ac.action, ac.endpoint, ac.method,
				ac.status_code, ac.response_time_ms, ac.user_agent, ac.device_type, '',
				ac.prompt_text, ac.prompt_response, ac.ai_provider, ac.ai_model, ac.patches_count, ac.success_status,
				ac.timestamp, ac.created_at
			FROM api_calls ac
			JOIN api_tokens ak ON ac.api_key_id = ak.id
			WHERE ac.user_id = $1
		`
	} else {
		query = `
			SELECT 
				ac.id, ac.user_id, ac.api_key_id, ak.name as api_key_name,
				ac.ip_address, ac.domain, ac.referrer, ac.action, ac.endpoint, ac.method,
				ac.status_code, ac.response_time_ms, ac.user_agent, ac.device_type, '',
				NULL, NULL, NULL, NULL, 0, NULL,
				ac.timestamp, ac.created_at
			FROM api_calls ac
			JOIN api_tokens ak ON ac.api_key_id = ak.id
			WHERE ac.user_id = $1
		`
	}
	
	args := []interface{}{userID}
	argIndex := 2

	// Add action filter
	if filters.Action != "" && filters.Action != "all" {
		query += fmt.Sprintf(" AND ac.action = $%d", argIndex)
		args = append(args, filters.Action)
		argIndex++
	}

	// Add domain filter
	if filters.Domain != "" && filters.Domain != "all" {
		query += fmt.Sprintf(" AND ac.domain = $%d", argIndex)
		args = append(args, filters.Domain)
		argIndex++
	}

	// Add time range filter
	if filters.TimeRange != "" && filters.TimeRange != "all" {
		var timeCondition string
		switch filters.TimeRange {
		case "1d":
			timeCondition = "ac.timestamp >= NOW() - INTERVAL '1 day'"
		case "7d":
			timeCondition = "ac.timestamp >= NOW() - INTERVAL '7 days'"
		case "30d":
			timeCondition = "ac.timestamp >= NOW() - INTERVAL '30 days'"
		case "90d":
			timeCondition = "ac.timestamp >= NOW() - INTERVAL '90 days'"
		}
		if timeCondition != "" {
			query += " AND " + timeCondition
		}
	}

	query += " ORDER BY ac.timestamp DESC"

	// Add limit and offset
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, filters.Limit, filters.Offset)

	var rows *sql.Rows
	rows, err = s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query API calls: %w", err)
	}
	defer rows.Close()

	var calls []models.APICall
	for rows.Next() {
		var call models.APICall
		err = rows.Scan(
			&call.ID, &call.UserID, &call.APIKeyID, &call.APIKeyName,
			&call.IPAddress, &call.Domain, &call.Referrer, &call.Action, &call.Endpoint, &call.Method,
			&call.StatusCode, &call.ResponseTimeMS, &call.UserAgent, &call.DeviceType, &call.BrowserFingerprint,
			&call.PromptText, &call.PromptResponse, &call.AIProvider, &call.AIModel, &call.PatchesCount, &call.SuccessStatus,
			&call.Timestamp, &call.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API call: %w", err)
		}
		calls = append(calls, call)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating API call rows: %w", err)
	}

	// Return empty slice if no calls found (instead of nil)
	if calls == nil {
		calls = []models.APICall{}
	}

	return calls, nil
}

// GetUsageStatsForUser returns usage statistics for a specific user
func (s *Service) GetUsageStatsForUser(userID string, filters models.UsageFilters) (*models.UsageStats, error) {
	// First check if the api_calls table exists
	var tableExists bool
	err := s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'api_calls'
		)
	`).Scan(&tableExists)
	if err != nil {
		return nil, fmt.Errorf("failed to check if api_calls table exists: %w", err)
	}
	
	if !tableExists {
		fmt.Printf("DEBUG: api_calls table does not exist, returning zero stats\n")
		return &models.UsageStats{
			TotalCalls:      0,
			CallsToday:      0,
			CallsThisWeek:   0,
			CallsThisMonth:  0,
			AvgResponseTime: 0,
			SuccessRate:     0,
		}, nil
	}

	baseQuery := "FROM api_calls ac WHERE ac.user_id = $1"
	args := []interface{}{userID}
	argIndex := 2

	// Add action filter
	if filters.Action != "" && filters.Action != "all" {
		baseQuery += fmt.Sprintf(" AND ac.action = $%d", argIndex)
		args = append(args, filters.Action)
		argIndex++
	}

	// Add domain filter
	if filters.Domain != "" && filters.Domain != "all" {
		baseQuery += fmt.Sprintf(" AND ac.domain = $%d", argIndex)
		args = append(args, filters.Domain)
		argIndex++
	}

	// Add time range filter if specified
	timeFilter := ""
	if filters.TimeRange != "" && filters.TimeRange != "all" {
		switch filters.TimeRange {
		case "1d":
			timeFilter = " AND ac.timestamp >= NOW() - INTERVAL '1 day'"
		case "7d":
			timeFilter = " AND ac.timestamp >= NOW() - INTERVAL '7 days'"
		case "30d":
			timeFilter = " AND ac.timestamp >= NOW() - INTERVAL '30 days'"
		case "90d":
			timeFilter = " AND ac.timestamp >= NOW() - INTERVAL '90 days'"
		}
		baseQuery += timeFilter
	}

	statsQuery := fmt.Sprintf(`
		SELECT 
			COALESCE(COUNT(*), 0) as total_calls,
			COALESCE(COUNT(CASE WHEN ac.timestamp >= CURRENT_DATE THEN 1 END), 0) as calls_today,
			COALESCE(COUNT(CASE WHEN ac.timestamp >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END), 0) as calls_this_week,
			COALESCE(COUNT(CASE WHEN ac.timestamp >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END), 0) as calls_this_month,
			COALESCE(AVG(ac.response_time_ms)::INTEGER, 0) as avg_response_time,
			COALESCE(
				(COUNT(CASE WHEN ac.status_code >= 200 AND ac.status_code < 300 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 
				0
			) as success_rate
		%s`, baseQuery)
	
	fmt.Printf("DEBUG: Executing stats query: %s\n", statsQuery)
	fmt.Printf("DEBUG: Query args: %v\n", args)

	var stats models.UsageStats
	err = s.db.QueryRow(statsQuery, args...).Scan(
		&stats.TotalCalls,
		&stats.CallsToday,
		&stats.CallsThisWeek,
		&stats.CallsThisMonth,
		&stats.AvgResponseTime,
		&stats.SuccessRate,
	)
	if err != nil {
		// If there's an error (like table doesn't exist), return zero stats
		if err.Error() == "sql: no rows in result set" {
			return &models.UsageStats{
				TotalCalls:      0,
				CallsToday:      0,
				CallsThisWeek:   0,
				CallsThisMonth:  0,
				AvgResponseTime: 0,
				SuccessRate:     0,
			}, nil
		}
		return nil, fmt.Errorf("failed to get usage stats: %w", err)
	}

	return &stats, nil
}

// GetUniqueDomainsForUser returns unique domains for a specific user
func (s *Service) GetUniqueDomainsForUser(userID string) ([]string, error) {
	// First check if the api_calls table exists
	var tableExists bool
	err := s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'api_calls'
		)
	`).Scan(&tableExists)
	if err != nil {
		return nil, fmt.Errorf("failed to check if api_calls table exists: %w", err)
	}
	
	if !tableExists {
		fmt.Printf("DEBUG: api_calls table does not exist, returning empty domains\n")
		return []string{}, nil
	}

	query := `
		SELECT DISTINCT ac.domain
		FROM api_calls ac
		WHERE ac.user_id = $1 
			AND ac.domain IS NOT NULL 
			AND ac.domain != ''
		ORDER BY ac.domain
	`

	var rows *sql.Rows
	rows, err = s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query unique domains: %w", err)
	}
	defer rows.Close()

	var domains []string
	for rows.Next() {
		var domain string
		err = rows.Scan(&domain)
		if err != nil {
			return nil, fmt.Errorf("failed to scan domain: %w", err)
		}
		domains = append(domains, domain)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating domain rows: %w", err)
	}

	// Return empty slice if no domains found (instead of nil)
	if domains == nil {
		domains = []string{}
	}

	return domains, nil
}

// LogAPICall logs an API call
func (s *Service) LogAPICall(call *models.APICall) error {
	if call.ID == uuid.Nil {
		call.ID = uuid.New()
	}
	if call.CreatedAt.IsZero() {
		call.CreatedAt = time.Now()
	}
	if call.Timestamp.IsZero() {
		call.Timestamp = time.Now()
	}

	// Check if browser_fingerprint column exists
	var fingerprintColumnExists bool
	err := s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_name = 'api_calls' AND column_name = 'browser_fingerprint'
		)
	`).Scan(&fingerprintColumnExists)
	if err != nil {
		fmt.Printf("DEBUG: failed to check fingerprint column for logging: %v\n", err)
		fingerprintColumnExists = false
	}

	// Check for new prompt tracking columns
	var promptColumnsExist bool
	err = s.db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.columns 
			WHERE table_name = 'api_calls' AND column_name = 'prompt_text'
		)
	`).Scan(&promptColumnsExist)
	if err != nil {
		fmt.Printf("DEBUG: failed to check prompt columns for logging: %v\n", err)
		promptColumnsExist = false
	}

	var query string
	var args []interface{}
	
	if fingerprintColumnExists && promptColumnsExist {
		query = `
			INSERT INTO api_calls (
				id, user_id, api_key_id, ip_address, domain, referrer, action, endpoint, method,
				status_code, response_time_ms, user_agent, device_type, browser_fingerprint,
				prompt_text, prompt_response, ai_provider, ai_model, patches_count, success_status,
				timestamp, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		`
		args = []interface{}{
			call.ID, call.UserID, call.APIKeyID, call.IPAddress, call.Domain, call.Referrer,
			call.Action, call.Endpoint, call.Method, call.StatusCode, call.ResponseTimeMS,
			call.UserAgent, call.DeviceType, call.BrowserFingerprint,
			call.PromptText, call.PromptResponse, call.AIProvider, call.AIModel, call.PatchesCount, call.SuccessStatus,
			call.Timestamp, call.CreatedAt,
		}
	} else if fingerprintColumnExists {
		query = `
			INSERT INTO api_calls (
				id, user_id, api_key_id, ip_address, domain, referrer, action, endpoint, method,
				status_code, response_time_ms, user_agent, device_type, browser_fingerprint, timestamp, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		`
		args = []interface{}{
			call.ID, call.UserID, call.APIKeyID, call.IPAddress, call.Domain, call.Referrer,
			call.Action, call.Endpoint, call.Method, call.StatusCode, call.ResponseTimeMS,
			call.UserAgent, call.DeviceType, call.BrowserFingerprint, call.Timestamp, call.CreatedAt,
		}
	} else if promptColumnsExist {
		query = `
			INSERT INTO api_calls (
				id, user_id, api_key_id, ip_address, domain, referrer, action, endpoint, method,
				status_code, response_time_ms, user_agent, device_type,
				prompt_text, prompt_response, ai_provider, ai_model, patches_count, success_status,
				timestamp, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		`
		args = []interface{}{
			call.ID, call.UserID, call.APIKeyID, call.IPAddress, call.Domain, call.Referrer,
			call.Action, call.Endpoint, call.Method, call.StatusCode, call.ResponseTimeMS,
			call.UserAgent, call.DeviceType,
			call.PromptText, call.PromptResponse, call.AIProvider, call.AIModel, call.PatchesCount, call.SuccessStatus,
			call.Timestamp, call.CreatedAt,
		}
	} else {
		query = `
			INSERT INTO api_calls (
				id, user_id, api_key_id, ip_address, domain, referrer, action, endpoint, method,
				status_code, response_time_ms, user_agent, device_type, timestamp, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		`
		args = []interface{}{
			call.ID, call.UserID, call.APIKeyID, call.IPAddress, call.Domain, call.Referrer,
			call.Action, call.Endpoint, call.Method, call.StatusCode, call.ResponseTimeMS,
			call.UserAgent, call.DeviceType, call.Timestamp, call.CreatedAt,
		}
	}

	_, err = s.db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("failed to log API call: %w", err)
	}

	return nil
}

// parseUserAgent attempts to determine device type from user agent string
func parseDeviceType(userAgent string) string {
	userAgent = strings.ToLower(userAgent)
	
	if strings.Contains(userAgent, "mobile") || strings.Contains(userAgent, "android") || strings.Contains(userAgent, "iphone") {
		return "mobile"
	}
	if strings.Contains(userAgent, "tablet") || strings.Contains(userAgent, "ipad") {
		return "tablet"
	}
	return "desktop"
}

// Helper function to extract domain from referrer or host header
func extractDomain(referrer, host string) string {
	if referrer != "" {
		// Simple domain extraction from referrer URL
		if strings.HasPrefix(referrer, "http://") {
			referrer = referrer[7:]
		} else if strings.HasPrefix(referrer, "https://") {
			referrer = referrer[8:]
		}
		if idx := strings.Index(referrer, "/"); idx != -1 {
			referrer = referrer[:idx]
		}
		if idx := strings.Index(referrer, ":"); idx != -1 {
			referrer = referrer[:idx]
		}
		return referrer
	}
	return host
}