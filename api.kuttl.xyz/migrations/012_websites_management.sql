-- Migration: Create websites management table
-- This table stores user websites with unique hash keys for tracking

CREATE TABLE IF NOT EXISTS websites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    hash_key VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_request_at TIMESTAMP,
    total_requests INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT unique_user_website_name UNIQUE (user_id, name),
    CONSTRAINT valid_url CHECK (url ~* '^https?://.*')
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_hash_key ON websites(hash_key);
CREATE INDEX IF NOT EXISTS idx_websites_active ON websites(is_active);
CREATE INDEX IF NOT EXISTS idx_websites_created_at ON websites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_websites_last_request_at ON websites(last_request_at DESC NULLS LAST);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_websites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_websites_updated_at
    BEFORE UPDATE ON websites
    FOR EACH ROW
    EXECUTE FUNCTION update_websites_updated_at();

-- Function to generate secure hash keys
CREATE OR REPLACE FUNCTION generate_website_hash_key()
RETURNS VARCHAR(64) AS $$
DECLARE
    chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(64) := '';
    i INTEGER := 0;
BEGIN
    -- Generate 64 character hash key
    FOR i IN 1..64 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update website request counts and last request time
CREATE OR REPLACE FUNCTION increment_website_requests(website_hash_key VARCHAR(64))
RETURNS VOID AS $$
BEGIN
    UPDATE websites 
    SET 
        total_requests = total_requests + 1,
        last_request_at = NOW()
    WHERE hash_key = website_hash_key AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO websites (user_id, name, url, description, hash_key) 
SELECT 
    u.id as user_id,
    'Personal Blog',
    'https://johndoe.blog',
    'My personal coding blog where I share tutorials and insights',
    generate_website_hash_key()
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO websites (user_id, name, url, description, hash_key, total_requests, last_request_at) 
SELECT 
    u.id as user_id,
    'E-commerce Store',
    'https://mystore.com',
    'Online store selling handmade crafts and accessories',
    generate_website_hash_key(),
    1247,
    NOW() - INTERVAL '2 hours'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO websites (user_id, name, url, description, hash_key, total_requests, last_request_at) 
SELECT 
    u.id as user_id,
    'Portfolio Website',
    'https://portfolio.johnkief.dev',
    'Professional portfolio showcasing my development projects',
    generate_website_hash_key(),
    89,
    NOW() - INTERVAL '5 minutes'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO websites (user_id, name, url, description, hash_key, is_active, total_requests) 
SELECT 
    u.id as user_id,
    'Old Client Project',
    'https://oldclient.com',
    'Legacy project no longer actively maintained',
    generate_website_hash_key(),
    FALSE,
    3421
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;