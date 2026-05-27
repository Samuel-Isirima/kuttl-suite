package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/internal/models"
	"api.kuttl.xyz/pkg/response"
)

type UsageHandler struct {
	usageService UsageService
}

type UsageService interface {
	GetAPICallsForUser(userID string, filters models.UsageFilters) ([]models.APICall, error)
	GetUsageStatsForUser(userID string, filters models.UsageFilters) (*models.UsageStats, error)
	GetUniqueDomainsForUser(userID string) ([]string, error)
	LogAPICall(call *models.APICall) error
}

func NewUsageHandler(usageService UsageService) *UsageHandler {
	return &UsageHandler{
		usageService: usageService,
	}
}

// GetAPICalls returns API calls for the authenticated user
func (h *UsageHandler) GetAPICalls(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse query parameters
	filters := models.UsageFilters{}
	
	if action := r.URL.Query().Get("action"); action != "" {
		filters.Action = action
	}
	
	if timeRange := r.URL.Query().Get("timeRange"); timeRange != "" {
		filters.TimeRange = timeRange
	}
	
	if domain := r.URL.Query().Get("domain"); domain != "" {
		filters.Domain = domain
	}
	
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 1000 {
			filters.Limit = limit
		}
	}
	if filters.Limit == 0 {
		filters.Limit = 100 // Default limit
	}
	
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}

	calls, err := h.usageService.GetAPICallsForUser(user.ID.String(), filters)
	if err != nil {
		response.InternalError(w, "Failed to get API calls")
		return
	}

	response.Success(w, calls)
}

// GetUsageStats returns usage statistics for the authenticated user
func (h *UsageHandler) GetUsageStats(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Parse query parameters
	filters := models.UsageFilters{}
	
	if action := r.URL.Query().Get("action"); action != "" {
		filters.Action = action
	}
	
	if timeRange := r.URL.Query().Get("timeRange"); timeRange != "" {
		filters.TimeRange = timeRange
	}
	
	if domain := r.URL.Query().Get("domain"); domain != "" {
		filters.Domain = domain
	}

	stats, err := h.usageService.GetUsageStatsForUser(user.ID.String(), filters)
	if err != nil {
		fmt.Printf("ERROR getting usage stats for user %s: %v\n", user.ID.String(), err)
		response.InternalError(w, "Failed to get usage stats")
		return
	}

	response.Success(w, stats)
}

// GetWebsites returns unique websites/domains for the authenticated user
func (h *UsageHandler) GetWebsites(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r.Context())
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	websites, err := h.usageService.GetUniqueDomainsForUser(user.ID.String())
	if err != nil {
		response.InternalError(w, "Failed to get websites")
		return
	}

	response.Success(w, websites)
}