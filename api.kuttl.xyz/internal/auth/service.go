package auth

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"fmt"
	"log"
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
	return s.LoginWithContext(req, "127.0.0.1", "unknown")
}

func (s *Service) LoginWithContext(req *models.LoginRequest, ipAddress, userAgent string) (*models.AuthResponse, error) {
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

	// Store session with real IP and user agent
	if err := s.createSession(user.ID, token, ipAddress, userAgent); err != nil {
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
	log.Printf("DEBUG: Creating API token for user %s, name: %s, expires_at: %v", userID, req.Name, req.ExpiresAt)
	
	// Generate the token
	fullToken, tokenHash, err := GenerateAPIToken(s.apiPrefix)
	if err != nil {
		log.Printf("ERROR: Failed to generate API token: %v", err)
		return nil, fmt.Errorf("failed to generate API token: %w", err)
	}

	// Extract token prefix (first 12 characters or full token if shorter)
	prefixLen := 12
	if len(fullToken) < prefixLen {
		prefixLen = len(fullToken)
	}
	tokenPrefix := fullToken[:prefixLen]

	apiToken := &models.APIToken{
		ID:          uuid.New(),
		UserID:      userID,
		Name:        req.Name,
		Token:       tokenHash,
		TokenPrefix: tokenPrefix,
		ExpiresAt:   req.ExpiresAt,
		IsActive:    true,
	}

	log.Printf("DEBUG: Inserting API token: ID=%s, UserID=%s, Name=%s, TokenPrefix=%s, ExpiresAt=%v", 
		apiToken.ID, apiToken.UserID, apiToken.Name, apiToken.TokenPrefix, apiToken.ExpiresAt)

	query := `
		INSERT INTO api_tokens (id, user_id, name, token_hash, token_prefix, expires_at, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`

	err = s.db.QueryRow(query, apiToken.ID, apiToken.UserID, apiToken.Name, 
		apiToken.Token, apiToken.TokenPrefix, apiToken.ExpiresAt, apiToken.IsActive).
		Scan(&apiToken.CreatedAt, &apiToken.UpdatedAt)
	if err != nil {
		log.Printf("ERROR: Database insert failed: %v", err)
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
	log.Printf("DEBUG: Getting API tokens for user %s", userID)
	
	query := `
		SELECT id, name, token_prefix, last_used, expires_at, is_active, created_at
		FROM api_tokens
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		log.Printf("ERROR: Failed to query API tokens: %v", err)
		return nil, fmt.Errorf("failed to get API tokens: %w", err)
	}
	defer rows.Close()

	var tokens []*models.APITokenResponse
	for rows.Next() {
		token := &models.APITokenResponse{}
		err := rows.Scan(&token.ID, &token.Name, &token.TokenPrefix, 
			&token.LastUsed, &token.ExpiresAt, &token.IsActive, &token.CreatedAt)
		if err != nil {
			log.Printf("ERROR: Failed to scan API token: %v", err)
			return nil, fmt.Errorf("failed to scan API token: %w", err)
		}
		tokens = append(tokens, token)
	}

	log.Printf("DEBUG: Found %d API tokens for user %s", len(tokens), userID)
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

// ─────────────────────────────────────────────
// Email Verification
// ─────────────────────────────────────────────

// CreateEmailVerificationToken creates a new email verification token
func (s *Service) CreateEmailVerificationToken(userID uuid.UUID) (string, error) {
	// Generate a secure random token
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	
	token := hex.EncodeToString(tokenBytes)
	tokenHash := HashAPIToken(token) // Reuse hash function
	
	// Token expires in 24 hours
	expiresAt := time.Now().Add(24 * time.Hour)
	
	query := `
		INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`
	
	_, err = s.db.Exec(query, userID, tokenHash, expiresAt)
	if err != nil {
		return "", fmt.Errorf("failed to create email verification token: %w", err)
	}
	
	return token, nil
}

// VerifyEmail verifies a user's email using the verification token
func (s *Service) VerifyEmail(token string) error {
	tokenHash := HashAPIToken(token)
	
	// Check if token is valid and not used
	var userID uuid.UUID
	var used bool
	var expiresAt time.Time
	
	query := `
		SELECT user_id, used, expires_at 
		FROM email_verification_tokens 
		WHERE token_hash = $1
	`
	
	err := s.db.QueryRow(query, tokenHash).Scan(&userID, &used, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("invalid verification token")
		}
		return fmt.Errorf("failed to get verification token: %w", err)
	}
	
	if used {
		return fmt.Errorf("verification token already used")
	}
	
	if time.Now().After(expiresAt) {
		return fmt.Errorf("verification token expired")
	}
	
	// Start transaction to update user and mark token as used
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Mark user as verified
	_, err = tx.Exec("UPDATE users SET verified = true WHERE id = $1", userID)
	if err != nil {
		return fmt.Errorf("failed to verify user: %w", err)
	}
	
	// Mark token as used
	_, err = tx.Exec("UPDATE email_verification_tokens SET used = true WHERE token_hash = $1", tokenHash)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}
	
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	return nil
}

// ResendEmailVerification creates a new verification token for a user
func (s *Service) ResendEmailVerification(email string) (*models.User, string, error) {
	// Get user by email
	user := &models.User{}
	query := `
		SELECT id, email, name, role, verified, created_at, updated_at
		FROM users 
		WHERE email = $1
	`
	
	err := s.db.QueryRow(query, strings.ToLower(email)).
		Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, "", fmt.Errorf("user not found")
		}
		return nil, "", fmt.Errorf("failed to get user: %w", err)
	}
	
	if user.Verified {
		return nil, "", fmt.Errorf("user email already verified")
	}
	
	// Invalidate existing tokens
	_, err = s.db.Exec("UPDATE email_verification_tokens SET used = true WHERE user_id = $1 AND used = false", user.ID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to invalidate existing tokens: %w", err)
	}
	
	// Create new token
	token, err := s.CreateEmailVerificationToken(user.ID)
	if err != nil {
		return nil, "", err
	}
	
	return user, token, nil
}

// ─────────────────────────────────────────────
// Password Reset
// ─────────────────────────────────────────────

// CreatePasswordResetToken creates a new password reset token
func (s *Service) CreatePasswordResetToken(email string) (*models.User, string, error) {
	// Get user by email
	user := &models.User{}
	query := `
		SELECT id, email, name, role, verified, created_at, updated_at
		FROM users 
		WHERE email = $1
	`
	
	err := s.db.QueryRow(query, strings.ToLower(email)).
		Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, "", fmt.Errorf("user not found")
		}
		return nil, "", fmt.Errorf("failed to get user: %w", err)
	}
	
	// Generate a secure random token
	tokenBytes := make([]byte, 32)
	_, err = rand.Read(tokenBytes)
	if err != nil {
		return nil, "", fmt.Errorf("failed to generate token: %w", err)
	}
	
	token := hex.EncodeToString(tokenBytes)
	tokenHash := HashAPIToken(token)
	
	// Token expires in 1 hour
	expiresAt := time.Now().Add(1 * time.Hour)
	
	// Invalidate existing reset tokens
	_, err = s.db.Exec("UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false", user.ID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to invalidate existing tokens: %w", err)
	}
	
	// Create new reset token
	query = `
		INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)
	`
	
	_, err = s.db.Exec(query, user.ID, tokenHash, expiresAt)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create password reset token: %w", err)
	}
	
	return user, token, nil
}

// ResetPassword resets a user's password using a reset token
func (s *Service) ResetPassword(token, newPassword string) error {
	tokenHash := HashAPIToken(token)
	
	// Check if token is valid and not used
	var userID uuid.UUID
	var used bool
	var expiresAt time.Time
	
	query := `
		SELECT user_id, used, expires_at 
		FROM password_reset_tokens 
		WHERE token_hash = $1
	`
	
	err := s.db.QueryRow(query, tokenHash).Scan(&userID, &used, &expiresAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("invalid reset token")
		}
		return fmt.Errorf("failed to get reset token: %w", err)
	}
	
	if used {
		return fmt.Errorf("reset token already used")
	}
	
	if time.Now().After(expiresAt) {
		return fmt.Errorf("reset token expired")
	}
	
	// Hash new password
	passwordHash, err := HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash password: %w", err)
	}
	
	// Start transaction to update password and mark token as used
	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()
	
	// Update password
	_, err = tx.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", passwordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	
	// Mark token as used
	_, err = tx.Exec("UPDATE password_reset_tokens SET used = true WHERE token_hash = $1", tokenHash)
	if err != nil {
		return fmt.Errorf("failed to mark token as used: %w", err)
	}
	
	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}
	
	return nil
}

// ChangePassword changes a user's password (authenticated)
func (s *Service) ChangePassword(userID uuid.UUID, currentPassword, newPassword string) error {
	// Get current password hash
	var currentHash string
	query := `SELECT password_hash FROM users WHERE id = $1`
	
	err := s.db.QueryRow(query, userID).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to get current password: %w", err)
	}
	
	// Verify current password
	if err := CheckPassword(currentPassword, currentHash); err != nil {
		return fmt.Errorf("current password is incorrect")
	}
	
	// Hash new password
	newPasswordHash, err := HashPassword(newPassword)
	if err != nil {
		return fmt.Errorf("failed to hash new password: %w", err)
	}
	
	// Update password
	_, err = s.db.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", newPasswordHash, userID)
	if err != nil {
		return fmt.Errorf("failed to update password: %w", err)
	}
	
	return nil
}

// UpdateProfile updates user profile information
func (s *Service) UpdateProfile(userID uuid.UUID, req *models.ProfileUpdateRequest) (*models.User, error) {
	// Check if email is already used by another user
	var exists bool
	err := s.db.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1 AND id != $2)", req.Email, userID).Scan(&exists)
	if err != nil {
		return nil, fmt.Errorf("failed to check email uniqueness: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("user with this email already exists")
	}

	// Update user profile
	query := `
		UPDATE users 
		SET name = $1, email = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING id, email, name, role, verified, created_at, updated_at
	`
	
	user := &models.User{}
	err = s.db.QueryRow(query, req.Name, req.Email, userID).Scan(
		&user.ID, &user.Email, &user.Name, &user.Role, &user.Verified, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("user not found")
		}
		return nil, fmt.Errorf("failed to update profile: %w", err)
	}
	
	return user, nil
}

