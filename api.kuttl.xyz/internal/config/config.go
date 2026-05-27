package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Database
	DatabaseURL              string
	DBMaxOpenConns           int
	DBMaxIdleConns           int
	DBConnMaxLifetimeMinutes int
	DBConnMaxIdleTimeMinutes int

	// JWT
	JWTSecret      string
	JWTExpiryHours int
	APITokenPrefix string

	// AI Provider
	AIProvider     string
	AnthropicKey   string
	AnthropicModel string
	OpenAIKey      string
	OpenAIModel    string
	GeminiKey      string
	GeminiModel    string

	// Server
	Port           string
	AllowedOrigins []string
	RateLimit      int

	// Logging
	LogLevel string
	LogFile  string
}

func Load() (*Config, error) {
	// Try to load .env file (ignore error if file doesn't exist)
	_ = godotenv.Load()

	cfg := &Config{
		DatabaseURL:              getEnv("DATABASE_URL", ""),
		DBMaxOpenConns:           getEnvInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:           getEnvInt("DB_MAX_IDLE_CONNS", 5),
		DBConnMaxLifetimeMinutes: getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 5),
		DBConnMaxIdleTimeMinutes: getEnvInt("DB_CONN_MAX_IDLE_TIME_MINUTES", 2),
		JWTSecret:                getEnv("JWT_SECRET", ""),
		JWTExpiryHours:           getEnvInt("JWT_EXPIRY_HOURS", 24),
		APITokenPrefix:           getEnv("API_TOKEN_PREFIX", "kuttl_"),

		AIProvider:     getEnv("AI_PROVIDER", "openai"),
		AnthropicKey:   getEnv("ANTHROPIC_API_KEY", ""),
		AnthropicModel: getEnv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
		OpenAIKey:      getEnv("OPENAI_API_KEY", ""),
		OpenAIModel:    getEnv("OPENAI_MODEL", "gpt-4o-mini"),
		GeminiKey:      getEnv("GEMINI_API_KEY", ""),
		GeminiModel:    getEnv("GEMINI_MODEL", "gemini-1.5-pro"),

		Port:           getEnv("PORT", "8080"),
		AllowedOrigins: parseAllowedOrigins(getEnv("ALLOWED_ORIGINS", "*")),
		RateLimit:      getEnvInt("RATE_LIMIT", 300),

		LogLevel: getEnv("LOG_LEVEL", "info"),
		LogFile:  getEnv("LOG_FILE", "logs/requests.log"),
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}

	if c.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}

	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters long")
	}

	// Validate AI provider configuration
	switch c.AIProvider {
	case "anthropic":
		if c.AnthropicKey == "" {
			return fmt.Errorf("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic")
		}
	case "openai":
		if c.OpenAIKey == "" {
			return fmt.Errorf("OPENAI_API_KEY is required when AI_PROVIDER=openai")
		}
	case "gemini":
		if c.GeminiKey == "" {
			return fmt.Errorf("GEMINI_API_KEY is required when AI_PROVIDER=gemini")
		}
	default:
		return fmt.Errorf("AI_PROVIDER must be one of: anthropic, openai, gemini")
	}

	return nil
}

func (c *Config) GetJWTExpiry() time.Duration {
	return time.Duration(c.JWTExpiryHours) * time.Hour
}

// GetDBConnMaxLifetime returns the database connection max lifetime
func (c *Config) GetDBConnMaxLifetime() time.Duration {
	return time.Duration(c.DBConnMaxLifetimeMinutes) * time.Minute
}

// GetDBConnMaxIdleTime returns the database connection max idle time
func (c *Config) GetDBConnMaxIdleTime() time.Duration {
	return time.Duration(c.DBConnMaxIdleTimeMinutes) * time.Minute
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func parseAllowedOrigins(originsStr string) []string {
	if originsStr == "*" {
		return []string{"*"}
	}

	origins := strings.Split(originsStr, ",")
	for i, origin := range origins {
		origins[i] = strings.TrimSpace(origin)
	}
	return origins
}
