package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"api.kuttl.xyz/internal/auth"
	"api.kuttl.xyz/internal/config"
	"api.kuttl.xyz/internal/database"
	"api.kuttl.xyz/internal/handlers"
	"api.kuttl.xyz/internal/middleware"
	"api.kuttl.xyz/internal/services"
	"api.kuttl.xyz/internal/usage"
	"api.kuttl.xyz/pkg/logger"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	
	// Debug: Log allowed origins immediately after config load
	log.Printf("DEBUG: Loaded allowed origins: %v", cfg.AllowedOrigins)

	// Connect to database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Configure PostgreSQL connection pool
	pgConfig := database.PostgreSQLConfig{
		MaxOpenConns:    cfg.DBMaxOpenConns,
		MaxIdleConns:    cfg.DBMaxIdleConns,
		ConnMaxLifetime: cfg.GetDBConnMaxLifetime(),
		ConnMaxIdleTime: cfg.GetDBConnMaxIdleTime(),
	}
	db.ConfigurePostgreSQL(pgConfig)

	// Check PostgreSQL version and health
	version, err := db.CheckPostgreSQLVersion()
	if err != nil {
		log.Fatalf("Failed to check PostgreSQL version: %v", err)
	}
	logger.Info(fmt.Sprintf("PostgreSQL version: %s", version))

	if err := db.HealthCheck(); err != nil {
		log.Fatalf("Database health check failed: %v", err)
	}
	logger.Info("Database health check passed")

	// Run migrations
	if err := db.RunMigrations("migrations"); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize logger
	requestLogger, err := logger.NewLogger(cfg.LogFile)
	if err != nil {
		log.Fatalf("Failed to initialize logger: %v", err)
	}
	defer requestLogger.Close()

	// Initialize services
	jwtService := auth.NewJWTService(cfg.JWTSecret, cfg.GetJWTExpiry())
	authService := auth.NewService(db, jwtService, cfg.APITokenPrefix)
	authMiddleware := middleware.NewAuthMiddleware(jwtService, authService, db.DB)
	usageService := usage.NewService(db.DB)

	// Initialize repositories with sqlx wrapper
	sqlxDB := sqlx.NewDb(db.DB, "postgres") 
	promptRepo := database.NewPromptRepository(sqlxDB)
	embeddingRepo := database.NewEmbeddingRepository(sqlxDB)
	snapshotRepo := database.NewSnapshotRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	dashboardHandler := handlers.NewDashboardHandler(db.DB)
	usageHandler := handlers.NewUsageHandler(usageService)
	customizationHandler := handlers.NewCustomizationHandler(db.DB)
	websitesHandler := handlers.NewWebsitesHandler(db.DB)
	
	// Initialize AI handler with config
	aiConfig := &handlers.AIConfig{
		Provider: cfg.AIProvider,
		APIKey:   getAIAPIKey(cfg),
		Model:    getAIModel(cfg),
		Timeout:  60 * time.Second,
	}
	aiHandler := handlers.NewAIHandler(promptRepo, embeddingRepo, snapshotRepo, aiConfig, usageService, db.DB)
	
	// Initialize AI provider for embeddings (hardcode OpenAI since Anthropic doesn't support embeddings)
	var aiProvider services.AIProvider
	if cfg.OpenAIKey != "" {
		aiProvider = services.NewOpenAIProvider(cfg.OpenAIKey)
		logger.Info("Using OpenAI for embeddings generation")
	} else {
		logger.Info("Warning: No OpenAI key found. Embeddings will be disabled.")
		aiProvider = nil
	}
	
	// Initialize embedding service and snapshot handler
	var embeddingService *services.EmbeddingService
	if aiProvider != nil {
		embeddingService = services.NewEmbeddingService(snapshotRepo, aiProvider)
		logger.Info("Embedding service created with AI provider")
	} else {
		logger.Info("Embeddings disabled - no suitable AI provider")
		embeddingService = nil
	}
	snapshotHandler := handlers.NewSnapshotHandler(snapshotRepo, promptRepo, embeddingService)

	// Initialize rate limiter
	rateLimiter := middleware.NewRateLimiter(cfg.RateLimit)

	// Setup routes
	router := setupRoutes(authHandler, aiHandler, snapshotHandler, dashboardHandler, usageHandler, customizationHandler, websitesHandler, authMiddleware, rateLimiter, requestLogger, cfg, db)

	logger.Info(fmt.Sprintf("Starting server on port %s", cfg.Port))
	logger.Info(fmt.Sprintf("AI Provider: %s", cfg.AIProvider))
	logger.Info(fmt.Sprintf("Allowed Origins: %v", cfg.AllowedOrigins))

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func setupRoutes(
	authHandler *handlers.AuthHandler,
	aiHandler *handlers.AIHandler,
	snapshotHandler *handlers.SnapshotHandler,
	dashboardHandler *handlers.DashboardHandler,
	usageHandler *handlers.UsageHandler,
	customizationHandler *handlers.CustomizationHandler,
	websitesHandler *handlers.WebsitesHandler,
	authMiddleware *middleware.AuthMiddleware,
	rateLimiter *middleware.RateLimiter,
	requestLogger *logger.Logger,
	cfg *config.Config,
	db *database.DB,
) http.Handler {
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.CORS(cfg.AllowedOrigins))
	router.Use(middleware.FingerprintMiddleware)
	router.Use(rateLimiter.Middleware)
	router.Use(requestLogger.Middleware)

	// Public routes
	public := router.PathPrefix("/api/v1").Subrouter()
	public.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	public.HandleFunc("/health/detailed", createDetailedHealthHandler(db)).Methods("GET", "OPTIONS")
	public.HandleFunc("/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	public.HandleFunc("/auth/login", authHandler.Login).Methods("POST", "OPTIONS")
	public.HandleFunc("/websites/by-hash/{hash_key}", websitesHandler.GetWebsiteByHashKey).Methods("GET", "OPTIONS")

	// Serve fingerprinting script
	router.HandleFunc("/fingerprint.js", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/javascript")
		w.Header().Set("Cache-Control", "public, max-age=86400") // Cache for 24 hours
		http.ServeFile(w, r, "static/fingerprint.js")
	}).Methods("GET")

	// Protected routes (JWT auth required)
	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.JWTAuth)
	protected.HandleFunc("/auth/profile", authHandler.GetProfile).Methods("GET", "OPTIONS")
	protected.HandleFunc("/auth/profile", authHandler.UpdateProfile).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/auth/change-password", authHandler.ChangePassword).Methods("POST", "OPTIONS")
	protected.HandleFunc("/auth/tokens", authHandler.CreateAPIToken).Methods("POST", "OPTIONS")
	protected.HandleFunc("/auth/tokens", authHandler.ListAPITokens).Methods("GET", "OPTIONS")
	protected.HandleFunc("/auth/tokens/{tokenId}", authHandler.RevokeAPIToken).Methods("DELETE", "OPTIONS")

	// Dashboard routes
	protected.HandleFunc("/dashboard", dashboardHandler.GetDashboardData).Methods("GET", "OPTIONS")
	protected.HandleFunc("/dashboard/metrics", dashboardHandler.GetMetrics).Methods("GET", "OPTIONS")
	protected.HandleFunc("/dashboard/activity", dashboardHandler.GetRecentActivity).Methods("GET", "OPTIONS")
	protected.HandleFunc("/dashboard/analytics", dashboardHandler.GetAnalyticsData).Methods("GET", "OPTIONS")
	protected.HandleFunc("/dashboard/usage", dashboardHandler.GetUsageData).Methods("GET", "OPTIONS")
	protected.HandleFunc("/dashboard/customizations-by-plan", dashboardHandler.GetCustomizationsByPlan).Methods("GET", "OPTIONS")

	// Usage routes
	protected.HandleFunc("/usage/calls", usageHandler.GetAPICalls).Methods("GET", "OPTIONS")
	protected.HandleFunc("/usage/stats", usageHandler.GetUsageStats).Methods("GET", "OPTIONS")
	protected.HandleFunc("/usage/websites", usageHandler.GetWebsites).Methods("GET", "OPTIONS")

	// Customization routes
	protected.HandleFunc("/customizations", customizationHandler.GetCustomizations).Methods("GET", "OPTIONS")
	protected.HandleFunc("/customizations", customizationHandler.CreateCustomization).Methods("POST", "OPTIONS")
	protected.HandleFunc("/customizations/stats", customizationHandler.GetCustomizationStats).Methods("GET", "OPTIONS")

	// Websites routes
	protected.HandleFunc("/websites", websitesHandler.ListWebsites).Methods("GET", "OPTIONS")
	protected.HandleFunc("/websites", websitesHandler.CreateWebsite).Methods("POST", "OPTIONS")
	protected.HandleFunc("/websites/{id}", websitesHandler.GetWebsite).Methods("GET", "OPTIONS")
	protected.HandleFunc("/websites/{id}", websitesHandler.UpdateWebsite).Methods("PUT", "OPTIONS")
	protected.HandleFunc("/websites/{id}", websitesHandler.DeleteWebsite).Methods("DELETE", "OPTIONS")

	// Snapshot routes
	protected.HandleFunc("/snapshots", snapshotHandler.CreateSnapshot).Methods("POST", "OPTIONS")
	protected.HandleFunc("/snapshots", snapshotHandler.ListSnapshots).Methods("GET", "OPTIONS")
	protected.HandleFunc("/snapshots/{id}", snapshotHandler.GetSnapshot).Methods("GET", "OPTIONS")
	protected.HandleFunc("/snapshots/{id}", snapshotHandler.DeleteSnapshot).Methods("DELETE", "OPTIONS")
	protected.HandleFunc("/snapshots/{id}/embeddings", snapshotHandler.GetSnapshotEmbeddings).Methods("GET", "OPTIONS")
	protected.HandleFunc("/snapshots/stats", snapshotHandler.GetSnapshotStats).Methods("GET", "OPTIONS")
	
	// Diff and similarity routes
	protected.HandleFunc("/snapshots/diffs", snapshotHandler.CreateDiff).Methods("POST", "OPTIONS")
	protected.HandleFunc("/snapshots/diffs", snapshotHandler.ListDiffs).Methods("GET", "OPTIONS") 
	protected.HandleFunc("/snapshots/diffs/{id}", snapshotHandler.GetDiff).Methods("GET", "OPTIONS")
	protected.HandleFunc("/snapshots/search", snapshotHandler.SearchSimilarComponents).Methods("POST", "OPTIONS")
	
	// Context routes
	protected.HandleFunc("/websites/context", snapshotHandler.GetWebsiteContext).Methods("GET", "OPTIONS")

	// AI and snapshot endpoints (supports website hash key auth for tracking)
	apiRoutes := router.PathPrefix("/api").Subrouter()
	apiRoutes.Use(authMiddleware.OptionalWebsiteAuth) // Allow website hash key auth
	apiRoutes.HandleFunc("/prompt", aiHandler.HandlePrompt).Methods("POST", "OPTIONS")
	
	// Debug route to test route registration
	apiRoutes.HandleFunc("/test", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Route registration working!"))
	}).Methods("GET")
	
	// Snapshot routes for development (no auth required)
	apiRoutes.HandleFunc("/snapshots", snapshotHandler.CreateSnapshot).Methods("POST", "OPTIONS")
	apiRoutes.HandleFunc("/snapshots", snapshotHandler.ListSnapshots).Methods("GET")
	apiRoutes.HandleFunc("/snapshots/{id}", snapshotHandler.GetSnapshot).Methods("GET")

	// Widget customization routes — identified by browser fingerprint + website hash key, no user account needed
	apiRoutes.HandleFunc("/customizations", customizationHandler.CreateCustomizationFromWidget).Methods("POST", "OPTIONS")
	apiRoutes.HandleFunc("/customizations", customizationHandler.GetCustomizationsByFingerprint).Methods("GET", "OPTIONS")

	return router
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"status":"healthy","timestamp":"%s"}`, time.Now().Format(time.RFC3339))
}

// Add a more detailed health check that includes database stats
func createDetailedHealthHandler(db *database.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		health := map[string]interface{}{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
		}

		// Check database health
		if err := db.HealthCheck(); err != nil {
			health["status"] = "unhealthy"
			health["database_error"] = err.Error()
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
		} else {
			// Add database stats
			stats := db.GetDatabaseStats()
			health["database"] = map[string]interface{}{
				"open_connections": stats.OpenConnections,
				"in_use":          stats.InUse,
				"idle":            stats.Idle,
				"wait_count":      stats.WaitCount,
				"wait_duration":   stats.WaitDuration.String(),
				"max_idle_closed": stats.MaxIdleClosed,
				"max_lifetime_closed": stats.MaxLifetimeClosed,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
		}

		json.NewEncoder(w).Encode(health)
	}
}

// Helper functions for AI configuration
func getAIAPIKey(cfg *config.Config) string {
	switch cfg.AIProvider {
	case "anthropic":
		return cfg.AnthropicKey
	case "openai":
		return cfg.OpenAIKey
	case "gemini":
		return cfg.GeminiKey
	default:
		return ""
	}
}

func getAIModel(cfg *config.Config) string {
	switch cfg.AIProvider {
	case "anthropic":
		return cfg.AnthropicModel
	case "openai":
		return cfg.OpenAIModel
	case "gemini":
		return cfg.GeminiModel
	default:
		return ""
	}
}