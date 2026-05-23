package auth

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"api.kuttl.xyz/internal/database"
	"api.kuttl.xyz/internal/models"
	"github.com/google/uuid"
)

type Service struct {
	db       *database.DB
	jwt      *JWTService
	apiPrefix string
}

func NewService(db *database.DB, jwtService *JWTService, apiPrefix string) *Service {
	return &Service{
		db:        db,
		jwt:       jwtService,
		apiPrefix: apiPrefix,
	}
}

// Register creates a new user account
func (s *Service) Register(req *models.RegisterRequest) (*models.User, error) {
	// Check if user already exists
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to check if user exists: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("user with email %s already exists", req.Email)
	}

	// Hash password
	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &models.User{
		ID:       uuid.New(),
		Email:    strings.ToLower(req.Email),
		Password: passwordHash,
		Name:     req.Name,
		Role:     models.RoleUser,
		Verified: false,
	}

	query := `
		INSERT INTO users (id, email, password_hash, name, role, verified)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at
	`
	
	err = s.db.QueryRow(query, user.ID, user.Email, user.Password, user.Name, user.Role, user.Verified).
		Scan(&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// Login authenticates a user and returns a token
func (s *Service) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	user := &models.User{}
	query := `
		SELECT id, email, password_hash, name, role, verified, created_at, updated_at
		FROM users 
		WHERE email = $1
	`
	
	err := s.db.QueryRow(query, strings.ToLower(req.Email)).
		Scan(&user.ID, &user.Email, &user.Password, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid email or password")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Check password
	if err := CheckPassword(req.Password, user.Password); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Generate JWT token
	token, err := s.jwt.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Store session
	if err := s.createSession(user.ID, token, "", ""); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	// Clear password before returning
	user.Password = ""

	return &models.AuthResponse{
		User:  user,
		Token: token,
	}, nil
}

// CreateAPIToken creates a new API token for a user
func (s *Service) CreateAPIToken(userID uuid.UUID, req *models.APITokenCreateRequest) (*models.APITokenCreateResponse, error) {
	// Generate the token
	fullToken, tokenHash, err := GenerateAPIToken(s.apiPrefix)
	if err != nil {
		return nil, fmt.Errorf("failed to generate API token: %w", err)
	}

	// Extract token prefix from the error message (hack for now)
	tokenPrefix := fullToken[:min(len(fullToken), 12)]

	apiToken := &models.APIToken{
		ID:          uuid.New(),
		UserID:      userID,
		Name:        req.Name,
		Token:       tokenHash,
		TokenPrefix: tokenPrefix,
		ExpiresAt:   req.ExpiresAt,
		IsActive:    true,
	}

	query := `
		INSERT INTO api_tokens (id, user_id, name, token_hash, token_prefix, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`

	err = s.db.QueryRow(query, apiToken.ID, apiToken.UserID, apiToken.Name, 
		apiToken.Token, apiToken.TokenPrefix, apiToken.ExpiresAt, apiToken.IsActive).
		Scan(&apiToken.CreatedAt, &apiToken.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create API token: %w", err)
	}

	return &models.APITokenCreateResponse{
		APITokenResponse: models.APITokenResponse{
			ID:          apiToken.ID,
			Name:        apiToken.Name,
			TokenPrefix: apiToken.TokenPrefix,
			LastUsed:    apiToken.LastUsed,
			ExpiresAt:   apiToken.ExpiresAt,
			IsActive:    apiToken.IsActive,
			CreatedAt:   apiToken.CreatedAt,
		},
		Token: fullToken,
	}, nil
}

// ValidateAPIToken validates an API token and returns the associated user
func (s *Service) ValidateAPIToken(token string) (*models.User, error) {
	tokenHash := HashAPIToken(token)

	user := &models.User{}
	query := `
		SELECT u.id, u.email, u.name, u.role, u.verified, u.created_at, u.updated_at
		FROM users u
		JOIN api_tokens at ON u.id = at.user_id
		WHERE at.token_hash = $1 
		AND at.is_active = true
		AND (at.expires_at IS NULL OR at.expires_at > CURRENT_TIMESTAMP)
	`

	err := s.db.QueryRow(query, tokenHash).
		Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("invalid or expired API token")
		}
		return nil, fmt.Errorf("failed to validate API token: %w", err)
	}

	// Update last_used timestamp
	_, err = s.db.Exec("UPDATE api_tokens SET last_used = CURRENT_TIMESTAMP WHERE token_hash = $1", tokenHash)
	if err != nil {
		// Log error but don't fail the request
		fmt.Printf("Failed to update last_used for API token: %v\n", err)
	}

	return user, nil
}

// GetUserAPITokens returns all API tokens for a user
func (s *Service) GetUserAPITokens(userID uuid.UUID) ([]*models.APITokenResponse, error) {
	query := `
		SELECT id, name, token_prefix, last_used, expires_at, is_active, created_at
		FROM api_tokens
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get API tokens: %w", err)
	}
	defer rows.Close()

	var tokens []*models.APITokenResponse
	for rows.Next() {
		token := &models.APITokenResponse{}
		err := rows.Scan(&token.ID, &token.Name, &token.TokenPrefix, 
			&token.LastUsed, &token.ExpiresAt, &token.IsActive, &token.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan API token: %w", err)
		}
		tokens = append(tokens, token)
	}

	return tokens, rows.Err()
}

// RevokeAPIToken revokes an API token
func (s *Service) RevokeAPIToken(userID, tokenID uuid.UUID) error {
	query := `UPDATE api_tokens SET is_active = false WHERE id = $1 AND user_id = $2`
	result, err := s.db.Exec(query, tokenID, userID)
	if err != nil {
		return fmt.Errorf("failed to revoke API token: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("API token not found")
	}

	return nil
}

// GetUserByID returns a user by ID
func (s *Service) GetUserByID(userID uuid.UUID) (*models.User, error) {
	user := &models.User{}
	query := `
		SELECT id, email, name, role, verified, created_at, updated_at
		FROM users 
		WHERE id = $1
	`
	
	err := s.db.QueryRow(query, userID).
		Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user, nil
}

func (s *Service) createSession(userID uuid.UUID, token, ipAddress, userAgent string) error {
	tokenHash := HashAPIToken(token) // Reuse the hash function
	expiresAt := time.Now().Add(24 * time.Hour) // Match JWT expiry

	query := `
		INSERT INTO sessions (user_id, token_hash, ip_address, user_agent, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`
	
	_, err := s.db.Exec(query, userID, tokenHash, ipAddress, userAgent, expiresAt)
	if err != nil {
		return fmt.Errorf("failed to create session: %w", err)
	}

	return nil
}

