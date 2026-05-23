.PHONY: build run dev test clean docker-up docker-down migrate

# Go parameters
BINARY_NAME=kuttl
BINARY_PATH=./cmd/server
BUILD_DIR=./build

# Database parameters
DB_URL=postgres://postgres:password@localhost:5432/kuttl_db?sslmode=disable

# Build the application
build:
	@echo "Building $(BINARY_NAME)..."
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) $(BINARY_PATH)

# Run the application
run: build
	@echo "Running $(BINARY_NAME)..."
	cd $(BUILD_DIR) && ./$(BINARY_NAME)

# Development mode with live reload (requires air: go install github.com/cosmtrek/air@latest)
dev:
	@echo "Starting development server..."
	air

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Run tests with coverage
test-coverage:
	@echo "Running tests with coverage..."
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Clean build artifacts
clean:
	@echo "Cleaning..."
	rm -rf $(BUILD_DIR)
	rm -f coverage.out coverage.html

# Install dependencies
deps:
	@echo "Installing dependencies..."
	go mod tidy
	go mod download

# Start PostgreSQL with Docker Compose
docker-up:
	@echo "Starting PostgreSQL with Docker Compose..."
	docker-compose up -d postgres

# Stop PostgreSQL container
docker-down:
	@echo "Stopping PostgreSQL container..."
	docker-compose down

# Start PostgreSQL with pgAdmin
docker-up-admin:
	@echo "Starting PostgreSQL with pgAdmin..."
	docker-compose --profile admin up -d

# Show database logs
docker-logs:
	@echo "Showing PostgreSQL logs..."
	docker-compose logs postgres

# Connect to PostgreSQL with psql
psql:
	@echo "Connecting to PostgreSQL..."
	docker-compose exec postgres psql -U postgres -d kuttl_db

# Run database migrations
migrate: build
	@echo "Running database migrations..."
	DATABASE_URL=$(DB_URL) $(BUILD_DIR)/$(BINARY_NAME) -migrate-only

# Create a new migration file
migration:
	@read -p "Enter migration name: " name; \
	timestamp=$$(date +%Y%m%d_%H%M%S); \
	filename="migrations/$${timestamp}_$${name}.sql"; \
	echo "Creating migration file: $$filename"; \
	touch "$$filename"

# Format code
fmt:
	@echo "Formatting code..."
	go fmt ./...

# Lint code (requires golangci-lint: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest)
lint:
	@echo "Linting code..."
	golangci-lint run

# Generate API documentation (requires swag: go install github.com/swaggo/swag/cmd/swag@latest)
docs:
	@echo "Generating API documentation..."
	swag init -g cmd/server/main.go

# Setup development environment
setup: deps docker-up
	@echo "Waiting for PostgreSQL to start..."
	sleep 5
	@echo "Running migrations..."
	make migrate
	@echo "Setup complete! You can now run 'make dev' to start the development server."

# Production build
build-prod:
	@echo "Building for production..."
	@mkdir -p $(BUILD_DIR)
	CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o $(BUILD_DIR)/$(BINARY_NAME) $(BINARY_PATH)

# Help
help:
	@echo "Available commands:"
	@echo "  build         Build the application"
	@echo "  run           Build and run the application"
	@echo "  dev           Start development server with live reload"
	@echo "  test          Run tests"
	@echo "  test-coverage Run tests with coverage report"
	@echo "  clean         Clean build artifacts"
	@echo "  deps          Install dependencies"
	@echo "  docker-up     Start PostgreSQL with Docker"
	@echo "  docker-down   Stop PostgreSQL container"
	@echo "  migrate       Run database migrations"
	@echo "  migration     Create a new migration file"
	@echo "  fmt           Format code"
	@echo "  lint          Lint code"
	@echo "  docs          Generate API documentation"
	@echo "  setup         Setup development environment"
	@echo "  build-prod    Build for production"
	@echo "  help          Show this help message"