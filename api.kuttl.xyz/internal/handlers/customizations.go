package handlers

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/pkg/response"
	"github.com/google/uuid"
)

type CustomizationHandler struct {
	db *sql.DB
}

func NewCustomizationHandler(db *sql.DB) *CustomizationHandler {
	return &CustomizationHandler{db: db}
}

// Frontend-friendly customization model
type WebsiteCustomization struct {
	ID                string    `json:"id" db:"id"`
	UserID           *string   `json:"user_id,omitempty" db:"user_id"`
	WebsiteURL       string    `json:"website_url" db:"website_url"`
	UserRequest      string    `json:"user_request" db:"user_request"`
	ChangeDescription string    `json:"change_description" db:"change_description"`
	ElementTargeted  string    `json:"element_targeted" db:"element_targeted"`
	ModificationType string    `json:"modification_type" db:"modification_type"`
	Status           string    `json:"status" db:"status"`
	AppliedAt        *time.Time `json:"applied_at" db:"applied_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	PromptID         *string    `json:"prompt_id,omitempty" db:"prompt_id"`
	SnapshotID       *string    `json:"snapshot_id,omitempty" db:"snapshot_id"`
}

type CustomizationStats struct {
	TotalChanges    int     `json:"total_changes"`
	SuccessRate     float64 `json:"success_rate"`
	PendingChanges  int     `json:"pending_changes"`
	AvgApplyTime    float64 `json:"avg_apply_time"`
}

func (ch *CustomizationHandler) GetCustomizations(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Error(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	userID := user.ID

	// Parse query parameters
	limit := 50 // default
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	offset := 0
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	status := r.URL.Query().Get("status")
	modType := r.URL.Query().Get("type")

	// Match customizations via all possible ownership paths:
	//   1. Directly created by the dashboard user (user_id)
	//   2. Widget customizations whose website_id FK resolves to a website owned by the user
	//   3. Widget customizations whose browser_client_id traces back to a website owned by the user
	baseWhere := `
		WHERE (
			wc.user_id = $1
			OR wc.website_id IN (SELECT id FROM websites WHERE user_id = $1)
			OR wc.browser_client_id IN (
				SELECT bc.id FROM browser_clients bc
				INNER JOIN websites w ON w.hash_key = bc.website_hash
				WHERE w.user_id = $1
			)
		)`

	query := `
		SELECT id, user_id, website_url, user_request, change_description,
			   element_targeted, modification_type, status, applied_at, created_at,
			   prompt_id, snapshot_id
		FROM website_customizations wc` + baseWhere

	args := []interface{}{userID}
	argIndex := 2

	if status != "" && status != "all" {
		query += ` AND wc.status = $` + strconv.Itoa(argIndex)
		args = append(args, status)
		argIndex++
	}

	if modType != "" && modType != "all" {
		query += ` AND wc.modification_type = $` + strconv.Itoa(argIndex)
		args = append(args, modType)
		argIndex++
	}

	query += ` ORDER BY wc.created_at DESC LIMIT $` + strconv.Itoa(argIndex) + ` OFFSET $` + strconv.Itoa(argIndex+1)
	args = append(args, limit, offset)

	rows, err := ch.db.Query(query, args...)
	if err != nil {
		log.Printf("GetCustomizations query error: %v", err)
		response.Error(w, http.StatusInternalServerError, "Failed to fetch customizations")
		return
	}
	defer rows.Close()

	var customizations []WebsiteCustomization
	for rows.Next() {
		var custom WebsiteCustomization
		err := rows.Scan(&custom.ID, &custom.UserID, &custom.WebsiteURL, &custom.UserRequest,
			&custom.ChangeDescription, &custom.ElementTargeted, &custom.ModificationType,
			&custom.Status, &custom.AppliedAt, &custom.CreatedAt, &custom.PromptID, &custom.SnapshotID)
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to parse customization data")
			return
		}
		customizations = append(customizations, custom)
	}

	log.Printf("GetCustomizations: returning %d records for user %s", len(customizations), userID)
	if customizations == nil {
		customizations = []WebsiteCustomization{}
	}
	response.JSON(w, http.StatusOK, customizations)
}

func (ch *CustomizationHandler) GetCustomizationStats(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Error(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	userID := user.ID

	var stats CustomizationStats

	scope := `
		FROM website_customizations wc
		WHERE (
			wc.user_id = $1
			OR wc.website_id IN (SELECT id FROM websites WHERE user_id = $1)
			OR wc.browser_client_id IN (
				SELECT bc.id FROM browser_clients bc
				INNER JOIN websites w ON w.hash_key = bc.website_hash
				WHERE w.user_id = $1
			)
		)`

	err := ch.db.QueryRow(`SELECT COUNT(*) `+scope, userID).Scan(&stats.TotalChanges)
	if err != nil {
		stats.TotalChanges = 0
	}

	var successCount int
	err = ch.db.QueryRow(`SELECT COUNT(*) `+scope+` AND wc.status = 'Applied'`, userID).Scan(&successCount)
	if err == nil && stats.TotalChanges > 0 {
		stats.SuccessRate = float64(successCount) / float64(stats.TotalChanges) * 100
	}

	err = ch.db.QueryRow(`SELECT COUNT(*) `+scope+` AND wc.status = 'Pending'`, userID).Scan(&stats.PendingChanges)
	if err != nil {
		stats.PendingChanges = 0
	}

	// Get average apply time (mock for now)
	stats.AvgApplyTime = 2.4

	response.JSON(w, http.StatusOK, stats)
}

func (ch *CustomizationHandler) CreateCustomization(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Error(w, http.StatusUnauthorized, "Authentication required")
		return
	}
	userID := user.ID

	var req struct {
		WebsiteURL        string `json:"website_url"`
		UserRequest       string `json:"user_request"`
		ChangeDescription string `json:"change_description"`
		ElementTargeted   string `json:"element_targeted"`
		ModificationType  string `json:"modification_type"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.WebsiteURL == "" || req.UserRequest == "" || req.ChangeDescription == "" ||
		req.ElementTargeted == "" || req.ModificationType == "" {
		response.Error(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	customizationID := uuid.New().String()

	_, err := ch.db.Exec(`
		INSERT INTO website_customizations
		(id, user_id, website_url, user_request, change_description,
		 element_targeted, modification_type, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', NOW())
	`, customizationID, userID, req.WebsiteURL, req.UserRequest, req.ChangeDescription,
		req.ElementTargeted, req.ModificationType)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create customization")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{"id": customizationID})
}

// CreateCustomizationFromWidget is called by the vanilla JS widget embedded on customer sites.
// Auth is by browser fingerprint + website hash key — no user account required.
func (ch *CustomizationHandler) CreateCustomizationFromWidget(w http.ResponseWriter, r *http.Request) {
	fingerprint := middleware.GetFingerprintFromContext(r.Context())
	if fingerprint == "" {
		response.Error(w, http.StatusBadRequest, "Browser fingerprint required")
		return
	}

	website := middleware.GetWebsiteFromContext(r.Context())

	var req struct {
		UserRequest       string `json:"user_request"`
		ChangeDescription string `json:"change_description"`
		ElementTargeted   string `json:"element_targeted"`
		ModificationType  string `json:"modification_type"`
		WebsiteURL        string `json:"website_url"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	if req.UserRequest == "" || req.ChangeDescription == "" ||
		req.ElementTargeted == "" || req.ModificationType == "" {
		response.Error(w, http.StatusBadRequest, "Missing required fields")
		return
	}

	websiteURL := req.WebsiteURL
	var websiteID *string
	if website != nil {
		websiteID = &website.ID
		if websiteURL == "" {
			websiteURL = website.URL
		}
	}
	if websiteURL == "" {
		response.Error(w, http.StatusBadRequest, "website_url is required when no website key is provided")
		return
	}

	customizationID := uuid.New().String()

	_, err := ch.db.Exec(`
		INSERT INTO website_customizations
		(id, browser_client_id, website_id, website_url, user_request, change_description,
		 element_targeted, modification_type, status, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', NOW())
	`, customizationID, fingerprint, websiteID, websiteURL,
		req.UserRequest, req.ChangeDescription, req.ElementTargeted, req.ModificationType)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to create customization")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{"id": customizationID})
}

// GetCustomizationsByFingerprint lets the widget retrieve its own stored customizations
// so they can be re-applied across sessions.
func (ch *CustomizationHandler) GetCustomizationsByFingerprint(w http.ResponseWriter, r *http.Request) {
	fingerprint := middleware.GetFingerprintFromContext(r.Context())
	if fingerprint == "" {
		response.Error(w, http.StatusBadRequest, "Browser fingerprint required")
		return
	}

	rows, err := ch.db.Query(`
		SELECT id, browser_client_id, website_url, user_request, change_description,
		       element_targeted, modification_type, status, applied_at, created_at
		FROM website_customizations
		WHERE browser_client_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`, fingerprint)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Failed to fetch customizations")
		return
	}
	defer rows.Close()

	type WidgetCustomization struct {
		ID                string     `json:"id"`
		BrowserClientID string    `json:"browser_client_id"`
		WebsiteURL        string     `json:"website_url"`
		UserRequest       string     `json:"user_request"`
		ChangeDescription string     `json:"change_description"`
		ElementTargeted   string     `json:"element_targeted"`
		ModificationType  string     `json:"modification_type"`
		Status            string     `json:"status"`
		AppliedAt         *time.Time `json:"applied_at"`
		CreatedAt         time.Time  `json:"created_at"`
	}

	var customizations []WidgetCustomization
	for rows.Next() {
		var c WidgetCustomization
		if err := rows.Scan(&c.ID, &c.BrowserClientID, &c.WebsiteURL, &c.UserRequest,
			&c.ChangeDescription, &c.ElementTargeted, &c.ModificationType,
			&c.Status, &c.AppliedAt, &c.CreatedAt); err != nil {
			response.Error(w, http.StatusInternalServerError, "Failed to parse customization data")
			return
		}
		customizations = append(customizations, c)
	}

	if customizations == nil {
		customizations = []WidgetCustomization{}
	}
	response.JSON(w, http.StatusOK, customizations)
}