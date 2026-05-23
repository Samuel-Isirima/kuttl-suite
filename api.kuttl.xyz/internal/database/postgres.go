package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
)

// PostgreSQLConfig holds PostgreSQL-specific configuration
type PostgreSQLConfig struct {
	MaxOpenConns    int           `json:"max_open_conns"`
	MaxIdleConns    int           `json:"max_idle_conns"`
	ConnMaxLifetime time.Duration `json:"conn_max_lifetime"`
	ConnMaxIdleTime time.Duration `json:"conn_max_idle_time"`
}

// DefaultPostgreSQLConfig returns sensible defaults for PostgreSQL
func DefaultPostgreSQLConfig() PostgreSQLConfig {
	return PostgreSQLConfig{
		MaxOpenConns:    25,                // Maximum number of open connections
		MaxIdleConns:    5,                 // Maximum number of idle connections
		ConnMaxLifetime: 5 * time.Minute,  // Maximum lifetime of a connection
		ConnMaxIdleTime: 2 * time.Minute,  // Maximum idle time of a connection
	}
}

// ConfigurePostgreSQL applies PostgreSQL-specific optimizations
func (db *DB) ConfigurePostgreSQL(config PostgreSQLConfig) {
	db.SetMaxOpenConns(config.MaxOpenConns)
	db.SetMaxIdleConns(config.MaxIdleConns)
	db.SetConnMaxLifetime(config.ConnMaxLifetime)
	db.SetConnMaxIdleTime(config.ConnMaxIdleTime)
}

// HealthCheck performs a comprehensive health check on the PostgreSQL database
func (db *DB) HealthCheck() error {
	// Test basic connectivity
	if err := db.Ping(); err != nil {
		return fmt.Errorf("ping failed: %w", err)
	}

	// Test a simple query
	var result int
	if err := db.QueryRow("SELECT 1").Scan(&result); err != nil {
		return fmt.Errorf("query test failed: %w", err)
	}

	if result != 1 {
		return fmt.Errorf("unexpected query result: %d", result)
	}

	return nil
}

// GetDatabaseStats returns database connection statistics
func (db *DB) GetDatabaseStats() sql.DBStats {
	return db.Stats()
}

// CheckPostgreSQLVersion checks if PostgreSQL version is supported
func (db *DB) CheckPostgreSQLVersion() (string, error) {
	var version string
	err := db.QueryRow("SELECT version()").Scan(&version)
	if err != nil {
		return "", fmt.Errorf("failed to get PostgreSQL version: %w", err)
	}

	return version, nil
}

// CreateDatabaseIfNotExists creates the database if it doesn't exist
// Note: This requires a connection to the 'postgres' database with appropriate privileges
func CreateDatabaseIfNotExists(adminURL, dbName string) error {
	db, err := sql.Open("postgres", adminURL)
	if err != nil {
		return fmt.Errorf("failed to connect to admin database: %w", err)
	}
	defer db.Close()

	// Check if database exists
	var exists bool
	query := "SELECT EXISTS(SELECT datname FROM pg_catalog.pg_database WHERE datname = $1)"
	err = db.QueryRow(query, dbName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check if database exists: %w", err)
	}

	if !exists {
		// Create database
		createQuery := fmt.Sprintf("CREATE DATABASE %s", dbName)
		_, err = db.Exec(createQuery)
		if err != nil {
			return fmt.Errorf("failed to create database %s: %w", dbName, err)
		}
		fmt.Printf("Database %s created successfully\n", dbName)
	} else {
		fmt.Printf("Database %s already exists\n", dbName)
	}

	return nil
}