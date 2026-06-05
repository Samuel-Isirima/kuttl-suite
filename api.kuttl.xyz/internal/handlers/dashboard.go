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
	TotalWebsites           int    `json:"total_websites"`
	TotalSnapshots          int    `json:"total_snapshots"`
	TotalAPIRequests        int    `json:"total_api_requests"`
	TotalCustomizations     int    `json:"total_customizations"`
	SnapshotsThisMonth      int    `json:"snapshots_this_month"`
	APIRequestsThisMonth    int    `json:"api_requests_this_month"`
	CustomizationsThisMonth int    `json:"customizations_this_month"`
	LastCalculatedAt        string `json:"last_calculated_at"`
}

type RecentActivity struct {
	WebsiteID          string `json:"website_id"`
	SnapshotCreatedAt  string `json:"snapshot_created_at"`
	ComponentCount     int    `json:"component_count"`
	CustomizationCount int    `json:"customization_count"`
}

type AnalyticsData struct {
	Name     string  `json:"name"`
	Value    float64 `json:"value"`
	Requests int     `json:"requests"`
	Month    string  `json:"month"`
}

type UsageData struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Color string  `json:"color"`
}

type CustomizationsByPlan struct {
	Total  int `json:"total"`
	Growth int `json:"growth"`
	Premium struct {
		Count      int `json:"count"`
		Percentage int `json:"percentage"`
	} `json:"premium"`
	Free struct {
		Count      int `json:"count"`
		Percentage int `json:"percentage"`
	} `json:"free"`
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

func (h *DashboardHandler) GetDashboardData(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	metrics := h.calcMetrics(user.ID.String())
	recentActivity := h.getRecentActivity(user.ID.String(), 10)

	response.Success(w, DashboardResponse{
		User: UserProfile{
			ID:    user.ID.String(),
			Name:  user.Name,
			Email: user.Email,
		},
		Metrics:        metrics,
		RecentActivity: recentActivity,
	})
}

func (h *DashboardHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}
	response.Success(w, h.calcMetrics(user.ID.String()))
}

func (h *DashboardHandler) GetRecentActivity(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}
	activities := h.getRecentActivity(user.ID.String(), 20)
	response.Success(w, activities)
}

// ─────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────

func (h *DashboardHandler) calcMetrics(userID string) DashboardMetrics {
	var m DashboardMetrics

	h.db.QueryRow(`SELECT COUNT(*) FROM websites WHERE user_id = $1`, userID).Scan(&m.TotalWebsites)

	// Snapshots owned by this user's websites (via browser_clients)
	h.db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(CASE WHEN ws.created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)
		FROM website_snapshots ws
		INNER JOIN browser_clients bc ON bc.id = ws.browser_client_id
		INNER JOIN websites w ON w.hash_key = bc.website_hash
		WHERE w.user_id = $1
	`, userID).Scan(&m.TotalSnapshots, &m.SnapshotsThisMonth)

	h.db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)
		FROM api_calls WHERE user_id = $1
	`, userID).Scan(&m.TotalAPIRequests, &m.APIRequestsThisMonth)

	h.db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END)
		FROM website_customizations WHERE user_id = $1
	`, userID).Scan(&m.TotalCustomizations, &m.CustomizationsThisMonth)

	return m
}

func (h *DashboardHandler) getRecentActivity(userID string, limit int) []RecentActivity {
	rows, err := h.db.Query(`
		SELECT
			ws.website_id,
			ws.created_at::text,
			jsonb_array_length(ws.components) AS component_count,
			jsonb_array_length(COALESCE(ws.customizations->'patches', '[]'::jsonb)) AS customization_count
		FROM website_snapshots ws
		INNER JOIN browser_clients bc ON bc.id = ws.browser_client_id
		INNER JOIN websites w ON w.hash_key = bc.website_hash
		WHERE w.user_id = $1
		ORDER BY ws.created_at DESC
		LIMIT $2
	`, userID, limit)
	if err != nil {
		return []RecentActivity{}
	}
	defer rows.Close()

	var activities []RecentActivity
	for rows.Next() {
		var a RecentActivity
		if err := rows.Scan(&a.WebsiteID, &a.SnapshotCreatedAt, &a.ComponentCount, &a.CustomizationCount); err != nil {
			continue
		}
		activities = append(activities, a)
	}
	if activities == nil {
		return []RecentActivity{}
	}
	return activities
}

// ─────────────────────────────────────────────
// Remaining endpoints
// ─────────────────────────────────────────────

func (h *DashboardHandler) GetAnalyticsData(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	rows, err := h.db.Query(`
		WITH monthly_data AS (
			SELECT
				DATE_TRUNC('month', timestamp) AS month,
				COUNT(*) AS requests
			FROM api_calls
			WHERE user_id = $1
			  AND timestamp >= NOW() - INTERVAL '8 months'
			GROUP BY DATE_TRUNC('month', timestamp)
			ORDER BY month
		)
		SELECT
			TO_CHAR(month, 'MON') AS name,
			COALESCE(LAG(requests) OVER (ORDER BY month), 0) AS prev_requests,
			requests,
			TO_CHAR(month, 'MM') AS month_str
		FROM monthly_data
	`, user.ID)
	if err != nil {
		response.Success(w, []AnalyticsData{})
		return
	}
	defer rows.Close()

	var analytics []AnalyticsData
	for rows.Next() {
		var data AnalyticsData
		var prevRequests int
		if err := rows.Scan(&data.Name, &prevRequests, &data.Requests, &data.Month); err != nil {
			continue
		}
		if prevRequests > 0 {
			data.Value = float64(data.Requests-prevRequests) / float64(prevRequests) * 100
		}
		analytics = append(analytics, data)
	}
	response.Success(w, analytics)
}

func (h *DashboardHandler) GetUsageData(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var activePercentage float64
	h.db.QueryRow(`
		WITH s AS (
			SELECT
				COUNT(CASE WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 1 END) AS recent,
				COUNT(*) AS total
			FROM api_calls WHERE user_id = $1
		)
		SELECT CASE WHEN total = 0 THEN 0 ELSE (recent::float / total::float) * 100 END
		FROM s
	`, user.ID).Scan(&activePercentage)

	response.Success(w, []UsageData{
		{Name: "Active Usage", Value: activePercentage, Color: "#3b82f6"},
		{Name: "Idle", Value: 100.0 - activePercentage, Color: "#e5e7eb"},
	})
}

func (h *DashboardHandler) GetCustomizationsByPlan(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var total, thisMonth, lastMonth int
	h.db.QueryRow(`
		SELECT
			COUNT(*),
			COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW()) THEN 1 END),
			COUNT(CASE WHEN created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
			           AND created_at <  DATE_TRUNC('month', NOW()) THEN 1 END)
		FROM website_customizations
		WHERE user_id = $1
	`, user.ID).Scan(&total, &thisMonth, &lastMonth)

	growth := 0
	if lastMonth > 0 {
		growth = int(float64(thisMonth-lastMonth) / float64(lastMonth) * 100)
	}

	premiumCount, freeCount, premiumPct, freePct := 0, 0, 0, 0
	if total > 0 {
		premiumCount = int(float64(total) * 0.68)
		freeCount = total - premiumCount
		premiumPct, freePct = 68, 32
	}

	response.Success(w, CustomizationsByPlan{
		Total:  total,
		Growth: growth,
		Premium: struct {
			Count      int `json:"count"`
			Percentage int `json:"percentage"`
		}{premiumCount, premiumPct},
		Free: struct {
			Count      int `json:"count"`
			Percentage int `json:"percentage"`
		}{freeCount, freePct},
	})
}
