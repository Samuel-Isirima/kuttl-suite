# PostgreSQL Database Setup for Kuttl API

## Prerequisites

1. **PostgreSQL 14+** installed on your system
2. **Command line access** to PostgreSQL
3. **Optional**: pgAdmin or another database GUI tool

## Installation

### macOS (Homebrew)
```bash
# Install PostgreSQL
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Create a user (if needed)
createuser -s postgres
```

### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-14 postgresql-client-14

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Switch to postgres user
sudo -u postgres psql
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user

## Database Setup

### 1. Connect to PostgreSQL
```bash
# Connect as postgres user
psql -U postgres -h localhost

# Or if you have a different setup
psql -U your_username -d postgres
```

### 2. Create Database and User
```sql
-- Create the database
CREATE DATABASE kuttl_dev;

-- Create a dedicated user for the application
CREATE USER kuttl_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kuttl_dev TO kuttl_user;

-- Connect to the database
\c kuttl_dev;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO kuttl_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kuttl_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kuttl_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kuttl_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kuttl_user;
```

### 3. Enable Required Extensions
```sql
-- Connect to your database
\c kuttl_dev;

-- Enable UUID extension (required for our models)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Optional: Enable pgvector for advanced vector similarity search
-- Only install if you have pgvector compiled and installed
-- CREATE EXTENSION IF NOT EXISTS "vector";
```

## Environment Configuration

Create a `.env` file in your project root:

```bash
# Database Configuration
DATABASE_URL=postgresql://kuttl_user:your_secure_password@localhost:5432/kuttl_dev

# AI Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
EMBEDDING_MODEL=text-embedding-3-small

# Server Configuration
PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional: Enable debug mode
DEBUG=true
ENABLE_EMBEDDINGS=true
```

## Running Migrations

The application includes an automatic migration system. When you start the server, it will:

1. Check for existing migrations
2. Run any new migration files in order
3. Create the following tables:
   - `users` - User accounts and authentication
   - `api_tokens` - API authentication tokens
   - `sessions` - User sessions
   - `website_snapshots` - Complete website state snapshots
   - `snapshot_diffs` - Incremental changes between snapshots
   - `embedding_vectors` - AI-generated embeddings
   - `website_contexts` - Cached website context summaries
   - `ai_processing_jobs` - Background processing queue

### Manual Migration (if needed)

If you want to run migrations manually:

```bash
# Navigate to the project directory
cd /path/to/api.kuttl.xyz

# Connect to your database
psql -U kuttl_user -d kuttl_dev

# Run migrations in order
\i migrations/001_init_users.sql
\i migrations/003_website_snapshots.sql
```

## Verify Setup

### 1. Test Database Connection
```bash
# Test connection
psql -U kuttl_user -d kuttl_dev -c "SELECT version();"
```

### 2. Check Tables
```sql
-- Connect to database
\c kuttl_dev;

-- List all tables
\dt

-- Check if tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- `ai_processing_jobs`
- `api_tokens`
- `embedding_vectors`
- `email_verification_tokens`
- `password_reset_tokens`
- `schema_migrations`
- `sessions`
- `snapshot_diffs`
- `users`
- `website_contexts`
- `website_snapshots`

### 3. Test with Go Application

Create a simple test file `test-db.go`:

```go
package main

import (
    "log"
    "api.kuttl.xyz/internal/database"
)

func main() {
    // Test database connection
    db, err := database.Connect("postgresql://kuttl_user:your_secure_password@localhost:5432/kuttl_dev")
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer db.Close()
    
    // Test query
    var version string
    err = db.QueryRow("SELECT version()").Scan(&version)
    if err != nil {
        log.Fatalf("Failed to query: %v", err)
    }
    
    log.Println("Database connection successful!")
    log.Printf("PostgreSQL version: %s", version)
}
```

Run the test:
```bash
go run test-db.go
```

## Production Setup

### 1. Security Hardening

```sql
-- Create production user with limited privileges
CREATE USER kuttl_prod WITH PASSWORD 'very_secure_production_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE kuttl_prod TO kuttl_prod;
GRANT USAGE ON SCHEMA public TO kuttl_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kuttl_prod;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO kuttl_prod;
```

### 2. Performance Optimization

```sql
-- Optimize for JSONB operations
CREATE INDEX CONCURRENTLY idx_snapshots_components_gin ON website_snapshots USING gin(components);
CREATE INDEX CONCURRENTLY idx_snapshots_metadata_gin ON website_snapshots USING gin(metadata);

-- Optimize for frequent queries
CREATE INDEX CONCURRENTLY idx_website_snapshots_website_user_created ON website_snapshots(website_id, user_id, created_at DESC);
CREATE INDEX CONCURRENTLY idx_embedding_vectors_website_type_created ON embedding_vectors(website_id, vector_type, created_at DESC);

-- Update PostgreSQL configuration
-- Edit postgresql.conf:
shared_preload_libraries = 'pg_stat_statements'
work_mem = 64MB
maintenance_work_mem = 256MB
effective_cache_size = 4GB
random_page_cost = 1.1
```

### 3. Backup Configuration

```bash
# Create backup script
cat > backup_kuttl.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
pg_dump -U kuttl_prod -h localhost kuttl_prod > backup_kuttl_\$DATE.sql
gzip backup_kuttl_\$DATE.sql
EOF

chmod +x backup_kuttl.sh

# Set up cron job for daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup_kuttl.sh
```

## Monitoring

### 1. Check Database Size
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 2. Monitor Active Connections
```sql
SELECT 
    client_addr,
    usename,
    application_name,
    state,
    query_start,
    query
FROM pg_stat_activity 
WHERE datname = 'kuttl_dev' AND state = 'active';
```

### 3. Performance Metrics
```sql
-- Most time-consuming queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;
```

## Troubleshooting

### Connection Issues
```bash
# Check if PostgreSQL is running
pg_ctl status

# Check PostgreSQL logs (location varies by OS)
tail -f /usr/local/var/log/postgresql@14.log  # macOS
sudo tail -f /var/log/postgresql/postgresql-14-main.log  # Ubuntu

# Test connection
pg_isready -h localhost -p 5432
```

### Permission Issues
```sql
-- Check user permissions
SELECT 
    grantee, 
    privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name='users';

-- Grant missing permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kuttl_user;
```

### Migration Issues
```sql
-- Check migration status
SELECT * FROM schema_migrations ORDER BY executed_at;

-- Reset migrations (CAUTION: Will lose data)
DROP TABLE IF EXISTS schema_migrations;
-- Re-run migrations
```

## Development vs Production

### Development
- Use `kuttl_dev` database
- Enable debug logging
- More relaxed security
- Smaller connection pools

### Production
- Use `kuttl_prod` database
- Disable debug logging
- SSL connections required
- Connection pooling with pgbouncer
- Regular backups
- Monitoring with tools like pg_stat_monitor

Your PostgreSQL database is now ready for the Kuttl API with full website snapshot and embedding support!