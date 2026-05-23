# Kuttl API Backend Documentation

## Overview

The Kuttl API backend is a Go-based REST API server that provides authentication, API token management, and AI integration for the InterceptJS library. It enables secure access to AI-powered UI customization features with proper user management and access controls.

## Table of Contents

1. [Architecture](#architecture)
2. [Authentication System](#authentication-system)
3. [API Endpoints](#api-endpoints)
4. [Database Schema](#database-schema)
5. [Setup & Configuration](#setup--configuration)
6. [Usage Examples](#usage-examples)
7. [Security Features](#security-features)
8. [Monitoring & Health Checks](#monitoring--health-checks)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

## Architecture

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   InterceptJS   │────│   Kuttl API     │────│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   AI Providers  │
                       │ (Anthropic/etc) │
                       └─────────────────┘
```

### Directory Structure

```
api.kuttl.xyz/
├── cmd/server/           # Application entry point
├── internal/             # Private application code
│   ├── auth/            # Authentication & JWT logic
│   ├── config/          # Configuration management
│   ├── database/        # Database connection & migrations
│   ├── handlers/        # HTTP request handlers
│   ├── middleware/      # HTTP middleware (auth, CORS, rate limiting)
│   └── models/          # Data models & request/response types
├── pkg/                 # Public packages
│   ├── logger/          # Request logging utilities
│   └── response/        # HTTP response helpers
├── migrations/          # Database schema migrations
└── docs/               # Documentation
```

## Authentication System

The backend supports two authentication methods:

### 1. JWT Authentication (Session-based)
- Used for web applications and short-term access
- Configurable expiry (default: 24 hours)
- Includes user metadata (ID, email, role)

### 2. API Key Authentication (Permanent tokens)
- Used for programmatic access and integrations
- Long-lived or permanent tokens
- Can be named and managed individually
- Tracks usage statistics

### User Roles
- **User**: Default role, can manage own tokens and access AI features
- **Admin**: Full system access (future expansion)

## API Endpoints

### Base URL
```
https://api.kuttl.xyz/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "verified": false,
      "created_at": "2024-01-01T00:00:00Z"
    },
    "message": "User created successfully. Please verify your email."
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "verified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Get User Profile
```http
GET /auth/profile
Authorization: Bearer <jwt_token>
```

### API Token Management

#### Create API Token
```http
POST /auth/tokens
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "My App Integration",
  "expires_at": "2025-01-01T00:00:00Z"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "token-uuid",
    "name": "My App Integration",
    "token": "kuttl_1234567890abcdef...",  // Only returned once!
    "token_prefix": "kuttl_123456",
    "expires_at": "2025-01-01T00:00:00Z",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### List API Tokens
```http
GET /auth/tokens
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "token-uuid",
      "name": "My App Integration",
      "token_prefix": "kuttl_123456",
      "last_used": "2024-01-05T10:30:00Z",
      "expires_at": "2025-01-01T00:00:00Z",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### Revoke API Token
```http
DELETE /auth/tokens/{token_id}
Authorization: Bearer <jwt_token>
```

### Health Check Endpoints

#### Basic Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### Detailed Health Check
```http
GET /health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "database": {
    "open_connections": 5,
    "in_use": 2,
    "idle": 3,
    "wait_count": 0,
    "wait_duration": "0s",
    "max_idle_closed": 0,
    "max_lifetime_closed": 0
  }
}
```

### AI Integration Endpoints (Future)

#### Send AI Prompt
```http
POST /prompt
Authorization: Bearer <jwt_token>
# OR
X-API-Key: kuttl_your_api_key

Content-Type: application/json

{
  "prompt": "Make the header blue and bigger",
  "tree": { /* DOM tree structure */ },
  "descAttr": "data-description",
  "selection": { /* selected element info */ }
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Tokens Table
```sql
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    token_prefix VARCHAR(20) NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setup & Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL=postgres://postgres:password@localhost:5432/kuttl_db?sslmode=disable

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRY_HOURS=24
API_TOKEN_PREFIX=kuttl_

# AI Provider
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# Server
PORT=8080
ALLOWED_ORIGINS=*
RATE_LIMIT=5

# Database Pool (Optional)
DB_MAX_OPEN_CONNS=25
DB_MAX_IDLE_CONNS=5
DB_CONN_MAX_LIFETIME_MINUTES=5

# Logging
LOG_LEVEL=info
LOG_FILE=logs/requests.log
```

### Quick Start

```bash
# 1. Start PostgreSQL
make docker-up

# 2. Copy environment config
cp .env.example .env
# Edit .env with your settings

# 3. Run setup
make setup

# 4. Start development server
make dev
```

## Usage Examples

### Frontend Integration (JavaScript)

```javascript
// Initialize InterceptJS with API authentication
const intercept = InterceptJS.init({
  root: document.getElementById('app'),
  persistKey: 'my-app-customizations',
  // Use API key for programmatic access
  ai: {
    provider: 'anthropic',
    apiKey: 'kuttl_your_api_key_here'
  }
});

// Make AI-powered changes
await intercept.prompt("Make the navigation bar dark themed");
```

### cURL Examples

```bash
# Register a new user
curl -X POST https://api.kuttl.xyz/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Login and get JWT token
curl -X POST https://api.kuttl.xyz/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword123"
  }'

# Create API token (using JWT)
curl -X POST https://api.kuttl.xyz/api/v1/auth/tokens \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Application"
  }'

# Use API key for requests
curl -X POST https://api.kuttl.xyz/api/v1/prompt \
  -H "X-API-Key: kuttl_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{ "prompt": "Make buttons bigger" }'
```

## Security Features

### Password Security
- Bcrypt hashing with salt
- Minimum 8 character requirement
- Secure password validation

### Token Security
- JWT tokens signed with HMAC-SHA256
- API tokens hashed with SHA-256 before storage
- Configurable token expiry
- Secure random token generation

### Rate Limiting
- Per-IP rate limiting (default: 5 requests/minute)
- Configurable limits
- Automatic cleanup of old rate limit data

### CORS Protection
- Configurable allowed origins
- Secure defaults for cross-origin requests
- Credential support for authenticated requests

### SQL Injection Prevention
- Parameterized queries throughout
- Input validation and sanitization
- PostgreSQL-specific protections

## Monitoring & Health Checks

### Health Endpoints
- `/health`: Basic server health
- `/health/detailed`: Includes database connection stats

### Logging
- JSON-structured request logs
- Configurable log levels
- Request timing and metadata
- Database query logging

### Metrics (Available via health endpoint)
- Database connection pool stats
- Active connections
- Request rates and timing
- Error rates

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created (new resource)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

### Common Error Scenarios

#### Invalid Authentication
```json
{
  "success": false,
  "error": "Invalid token"
}
```

#### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

#### Validation Errors
```json
{
  "success": false,
  "error": "Email and password are required"
}
```

## Rate Limiting

### Default Limits
- **5 requests per minute per IP address**
- Configurable via `RATE_LIMIT` environment variable
- Uses sliding window algorithm

### Headers
Rate limit information is included in response headers:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

### Bypass Rate Limiting
Rate limiting can be bypassed by:
- Using API keys (higher limits)
- Whitelisting specific IPs (configuration)
- Admin role users (future feature)

## Development & Deployment

### Development Commands
```bash
make dev          # Start development server with hot reload
make test         # Run tests
make lint         # Lint code
make fmt          # Format code
make migration    # Create new database migration
```

### Production Deployment
```bash
make build-prod   # Build optimized binary
make migrate      # Run database migrations
./build/kuttl     # Start production server
```

### Docker Support
```bash
make docker-up         # Start PostgreSQL
make docker-up-admin   # Start PostgreSQL + pgAdmin
make docker-down       # Stop containers
make psql             # Connect to database
```

This backend provides a robust foundation for your AI-powered UI customization platform with comprehensive authentication, security, and monitoring capabilities.