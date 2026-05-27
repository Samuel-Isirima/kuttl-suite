package handlers

import (
	"database/sql"
	"net/http"

	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/pkg/response"
)

type DashboardHandler struct {
	db *sql.DB
}

func NewDashboardHandler(db *sql.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

type DashboardMetrics struct {
	TotalWebsites       int     `json:"total_websites"`
	TotalSnapshots      int     `json:"total_snapshots"`
	TotalAPIRequests    int     `json:"total_api_requests"`
	TotalCustomizations int     `json:"total_customizations"`
	SnapshotsThisMonth  int     `json:"snapshots_this_month"`
	APIRequestsThisMonth int    `json:"api_requests_this_month"`
	CustomizationsThisMonth int `json:"customizations_this_month"`
	LastCalculatedAt    string  `json:"last_calculated_at"`
}

type RecentActivity struct {
	WebsiteID           string `json:"website_id"`
	SnapshotCreatedAt   string `json:"snapshot_created_at"`
	ComponentCount      int    `json:"component_count"`
	CustomizationCount  int    `json:"customization_count"`
}

type DashboardResponse struct {
	User           UserProfile      `json:"user"`
	Metrics        DashboardMetrics `json:"metrics"`
	RecentActivity []RecentActivity `json:"recent_activity"`
}

type UserProfile struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// GetDashboardData returns comprehensive dashboard data for the authenticated user
func (h *DashboardHandler) GetDashboardData(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// First, ensure user statistics are up to date
	_, err := h.db.Exec("SELECT calculate_user_statistics($1)", user.ID)
	if err != nil {
		response.InternalError(w, "Failed to calculate user statistics")
		return
	}

	// Get user metrics
	var metrics DashboardMetrics
	query := `
		SELECT 
			COALESCE(total_websites, 0),
			COALESCE(total_snapshots, 0),
			COALESCE(total_api_requests, 0),
			COALESCE(total_customizations, 0),
			COALESCE(snapshots_this_month, 0),
			COALESCE(api_requests_this_month, 0),
			COALESCE(customizations_this_month, 0),
			COALESCE(last_calculated_at::text, '')
		FROM user_statistics 
		WHERE user_id = $1
	`
	
	err = h.db.QueryRow(query, user.ID).Scan(
		&metrics.TotalWebsites,
		&metrics.TotalSnapshots,
		&metrics.TotalAPIRequests,
		&metrics.TotalCustomizations,
		&metrics.SnapshotsThisMonth,
		&metrics.APIRequestsThisMonth,
		&metrics.CustomizationsThisMonth,
		&metrics.LastCalculatedAt,
	)
	
	if err != nil && err != sql.ErrNoRows {
		response.InternalError(w, "Failed to get user metrics")
		return
	}

	// Get recent activity
	activityQuery := `
		SELECT 
			website_id,
			snapshot_created_at::text,
			component_count,
			customization_count
		FROM recent_user_activity 
		WHERE user_id = $1 
		ORDER BY snapshot_created_at DESC 
		LIMIT 10
	`
	
	rows, err := h.db.Query(activityQuery, user.ID)
	if err != nil {
		response.InternalError(w, "Failed to get recent activity")
		return
	}
	defer rows.Close()

	var recentActivity []RecentActivity
	for rows.Next() {
		var activity RecentActivity
		err := rows.Scan(
			&activity.WebsiteID,
			&activity.SnapshotCreatedAt,
			&activity.ComponentCount,
			&activity.CustomizationCount,
		)
		if err != nil {
			continue
		}
		recentActivity = append(recentActivity, activity)
	}

	if recentActivity == nil {
		recentActivity = []RecentActivity{}
	}

	// Build response
	dashboardData := DashboardResponse{
		User: UserProfile{
			ID:    user.ID.String(),
			Name:  user.Name,
			Email: user.Email,
		},
		Metrics:        metrics,
		RecentActivity: recentActivity,
	}

	response.Success(w, dashboardData)
}

// GetMetrics returns just the metrics data
func (h *DashboardHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Update statistics
	_, err := h.db.Exec("SELECT calculate_user_statistics($1)", user.ID)
	if err != nil {
		response.InternalError(w, "Failed to calculate user statistics")
		return
	}

	// Get metrics
	var metrics DashboardMetrics
	query := `
		SELECT 
			COALESCE(total_websites, 0),
			COALESCE(total_snapshots, 0),
			COALESCE(total_api_requests, 0),
			COALESCE(total_customizations, 0),
			COALESCE(snapshots_this_month, 0),
			COALESCE(api_requests_this_month, 0),
			COALESCE(customizations_this_month, 0),
			COALESCE(last_calculated_at::text, '')
		FROM user_statistics 
		WHERE user_id = $1
	`
	
	err = h.db.QueryRow(query, user.ID).Scan(
		&metrics.TotalWebsites,
		&metrics.TotalSnapshots,
		&metrics.TotalAPIRequests,
		&metrics.TotalCustomizations,
		&metrics.SnapshotsThisMonth,
		&metrics.APIRequestsThisMonth,
		&metrics.CustomizationsThisMonth,
		&metrics.LastCalculatedAt,
	)
	
	if err != nil && err != sql.ErrNoRows {
		response.InternalError(w, "Failed to get user metrics")
		return
	}

	response.Success(w, metrics)
}

// GetRecentActivity returns recent user activity
func (h *DashboardHandler) GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Get recent activity
	query := `
		SELECT 
			website_id,
			snapshot_created_at::text,
			component_count,
			customization_count
		FROM recent_user_activity 
		WHERE user_id = $1 
		ORDER BY snapshot_created_at DESC 
		LIMIT 20
	`
	
	rows, err := h.db.Query(query, user.ID)
	if err != nil {
		response.InternalError(w, "Failed to get recent activity")
		return
	}
	defer rows.Close()

	var activities []RecentActivity
	for rows.Next() {
		var activity RecentActivity
		err := rows.Scan(
			&activity.WebsiteID,
			&activity.SnapshotCreatedAt,
			&activity.ComponentCount,
			&activity.CustomizationCount,
		)
		if err != nil {
			continue
		}
		activities = append(activities, activity)
	}

	if activities == nil {
		activities = []RecentActivity{}
	}

	response.Success(w, activities)
}

// LogAPIRequest logs an API request for analytics
func (h *DashboardHandler) LogAPIRequest(userID string, endpoint, method string, statusCode, responseTimeMs int, ipAddress, userAgent string) {
	// This would be called by middleware to log API requests
	query := `
		SELECT log_api_request($1, $2, $3, $4, $5, $6::inet, $7)
	`
	
	h.db.Exec(query, userID, endpoint, method, statusCode, responseTimeMs, ipAddress, userAgent)
}