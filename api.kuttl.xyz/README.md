# Kuttl API Server

A Go-based REST API server for the Kuttl AI-powered UI customization platform. This server provides authentication, API token management, and AI integration for the InterceptJS library.

## Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **API Token Management**: Create and manage API tokens for programmatic access
- **Role-Based Access Control**: Support for admin and user roles
- **Rate Limiting**: Configurable rate limiting per IP address
- **Database Migrations**: Automatic database schema management
- **CORS Support**: Configurable cross-origin resource sharing
- **Request Logging**: JSON-structured request logging
- **AI Integration**: Support for multiple AI providers (Anthropic, OpenAI, Gemini)

## Project Structure

```
api.kuttl.xyz/
├── cmd/server/           # Application entry point
├── internal/             # Private application code
│   ├── auth/            # Authentication logic
│   ├── config/          # Configuration management
│   ├── database/        # Database connection and utilities
│   ├── handlers/        # HTTP handlers
│   ├── middleware/      # HTTP middleware
│   └── models/          # Data models
├── pkg/                 # Public packages
│   ├── logger/          # Logging utilities
│   └── response/        # HTTP response helpers
├── migrations/          # Database migrations
└── logs/               # Log files
```

## Quick Start

### Prerequisites

- Go 1.21 or later
- PostgreSQL 15 or later
- Make (optional, but recommended)

### Development Setup

1. **Clone and navigate to the project:**
   ```bash
   cd api.kuttl.xyz
   ```

2. **Set up the environment:**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   vim .env
   ```

3. **Start PostgreSQL (using Docker):**
   ```bash
   make docker-up
   ```

4. **Set up the development environment:**
   ```bash
   make setup
   ```

5. **Start the development server:**
   ```bash
   make dev
   ```

The server will start on `http://localhost:8080` (or the port specified in your `.env` file).

## Configuration

All configuration is done via environment variables. Copy `.env.example` to `.env` and customize:

### Required Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens (minimum 32 characters)
- `AI_PROVIDER`: AI provider (`anthropic`, `openai`, or `gemini`)
- Provider-specific API keys:
  - `ANTHROPIC_API_KEY` (if using Anthropic)
  - `OPENAI_API_KEY` (if using OpenAI)
  - `GEMINI_API_KEY` (if using Gemini)

### Optional Variables

- `PORT`: Server port (default: 8080)
- `JWT_EXPIRY_HOURS`: JWT token expiry in hours (default: 24)
- `API_TOKEN_PREFIX`: Prefix for API tokens (default: "kuttl_")
- `ALLOWED_ORIGINS`: CORS allowed origins (default: "*")
- `RATE_LIMIT`: Requests per minute per IP (default: 5)
- `LOG_LEVEL`: Logging level (default: "info")
- `LOG_FILE`: Log file path (default: "logs/requests.log")

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/profile` - Get user profile (authenticated)

### API Tokens

- `POST /api/v1/auth/tokens` - Create new API token (authenticated)
- `GET /api/v1/auth/tokens` - List user's API tokens (authenticated)
- `DELETE /api/v1/auth/tokens/{id}` - Revoke API token (authenticated)

### Health Check

- `GET /api/v1/health` - Health check endpoint

## Authentication Methods

The API supports two authentication methods:

1. **JWT Tokens**: Include in `Authorization: Bearer <token>` header
2. **API Keys**: Include in `X-API-Key: <api-key>` header

## Development Commands

```bash
# Build the application
make build

# Run the application
make run

# Start development server with live reload
make dev

# Run tests
make test

# Run tests with coverage
make test-coverage

# Format code
make fmt

# Lint code
make lint

# Run database migrations
make migrate

# Create new migration
make migration

# Clean build artifacts
make clean

# Start PostgreSQL container
make docker-up

# Stop PostgreSQL container
make docker-down
```

## Database Migrations

The application automatically runs migrations on startup. To create a new migration:

```bash
make migration
```

This will create a new `.sql` file in the `migrations/` directory with a timestamp prefix.

## Production Deployment

1. **Build the production binary:**
   ```bash
   make build-prod
   ```

2. **Set environment variables** for your production environment.

3. **Run the binary:**
   ```bash
   ./build/kuttl
   ```

## Security Considerations

- Always use strong, randomly generated JWT secrets in production
- Use HTTPS in production environments
- Regularly rotate API keys and JWT secrets
- Monitor rate limiting and adjust as needed
- Keep dependencies up to date
- Use environment-specific database credentials
- Enable database connection pooling for production loads

## Monitoring and Logging

The application logs all HTTP requests in JSON format to the configured log file. Each log entry includes:

- Timestamp
- HTTP method and path
- Response status code
- Request duration
- Client IP address
- User agent

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.