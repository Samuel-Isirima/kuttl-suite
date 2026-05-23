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
	authMiddleware := middleware.NewAuthMiddleware(jwtService, authService)

	// Initialize repositories with sqlx wrapper
	sqlxDB := sqlx.NewDb(db.DB, "postgres") 
	promptRepo := database.NewPromptRepository(sqlxDB)
	embeddingRepo := database.NewEmbeddingRepository(sqlxDB)
	snapshotRepo := database.NewSnapshotRepository(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	
	// Initialize AI handler with config
	aiConfig := &handlers.AIConfig{
		Provider: cfg.AIProvider,
		APIKey:   getAIAPIKey(cfg),
		Model:    getAIModel(cfg),
		Timeout:  60 * time.Second,
	}
	aiHandler := handlers.NewAIHandler(promptRepo, embeddingRepo, snapshotRepo, aiConfig)
	
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
	router := setupRoutes(authHandler, aiHandler, snapshotHandler, authMiddleware, rateLimiter, requestLogger, cfg, db)

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
	authMiddleware *middleware.AuthMiddleware,
	rateLimiter *middleware.RateLimiter,
	requestLogger *logger.Logger,
	cfg *config.Config,
	db *database.DB,
) http.Handler {
	router := mux.NewRouter()

	// Apply global middleware
	router.Use(middleware.CORS(cfg.AllowedOrigins))
	router.Use(rateLimiter.Middleware)
	router.Use(requestLogger.Middleware)

	// Public routes
	public := router.PathPrefix("/api/v1").Subrouter()
	public.HandleFunc("/health", healthHandler).Methods("GET")
	public.HandleFunc("/health/detailed", createDetailedHealthHandler(db)).Methods("GET")
	public.HandleFunc("/auth/register", authHandler.Register).Methods("POST")
	public.HandleFunc("/auth/login", authHandler.Login).Methods("POST")

	// Protected routes (JWT auth required)
	protected := router.PathPrefix("/api/v1").Subrouter()
	protected.Use(authMiddleware.JWTAuth)
	protected.HandleFunc("/auth/profile", authHandler.GetProfile).Methods("GET")
	protected.HandleFunc("/auth/tokens", authHandler.CreateAPIToken).Methods("POST")
	protected.HandleFunc("/auth/tokens", authHandler.ListAPITokens).Methods("GET")
	protected.HandleFunc("/auth/tokens/{tokenId}", authHandler.RevokeAPIToken).Methods("DELETE")

	// Snapshot routes
	protected.HandleFunc("/snapshots", snapshotHandler.CreateSnapshot).Methods("POST")
	protected.HandleFunc("/snapshots", snapshotHandler.ListSnapshots).Methods("GET")
	protected.HandleFunc("/snapshots/{id}", snapshotHandler.GetSnapshot).Methods("GET")
	protected.HandleFunc("/snapshots/{id}", snapshotHandler.DeleteSnapshot).Methods("DELETE")
	protected.HandleFunc("/snapshots/{id}/embeddings", snapshotHandler.GetSnapshotEmbeddings).Methods("GET")
	protected.HandleFunc("/snapshots/stats", snapshotHandler.GetSnapshotStats).Methods("GET")
	
	// Diff and similarity routes
	protected.HandleFunc("/snapshots/diffs", snapshotHandler.CreateDiff).Methods("POST")
	protected.HandleFunc("/snapshots/diffs", snapshotHandler.ListDiffs).Methods("GET") 
	protected.HandleFunc("/snapshots/diffs/{id}", snapshotHandler.GetDiff).Methods("GET")
	protected.HandleFunc("/snapshots/search", snapshotHandler.SearchSimilarComponents).Methods("POST")
	
	// Context routes
	protected.HandleFunc("/websites/context", snapshotHandler.GetWebsiteContext).Methods("GET")

	// AI and snapshot endpoints (supports both JWT and API key auth, or no auth for development)
	apiRoutes := router.PathPrefix("/api").Subrouter()
	apiRoutes.Use(authMiddleware.OptionalAuth) // Allow both auth types
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