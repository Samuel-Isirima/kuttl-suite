-- Initial database setup for Kuttl
-- This script is run when the PostgreSQL container starts for the first time

-- Create the main database (already done by POSTGRES_DB env var)
-- CREATE DATABASE kuttl_db;

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "citext";     -- Case-insensitive text
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- Query statistics

-- Create a read-only user for analytics/reporting (optional)
-- CREATE USER kuttl_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE kuttl_db TO kuttl_readonly;
-- GRANT USAGE ON SCHEMA public TO kuttl_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO kuttl_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO kuttl_readonly;