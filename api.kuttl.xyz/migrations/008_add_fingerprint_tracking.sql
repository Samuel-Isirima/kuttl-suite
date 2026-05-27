-- Add browser fingerprint tracking to API calls
ALTER TABLE api_calls ADD COLUMN browser_fingerprint TEXT;

-- Add index for fingerprint lookups
CREATE INDEX idx_api_calls_fingerprint ON api_calls(browser_fingerprint);
CREATE INDEX idx_api_calls_user_fingerprint ON api_calls(user_id, browser_fingerprint);

-- Add fingerprint tracking to snapshots table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'website_snapshots') THEN
        ALTER TABLE website_snapshots ADD COLUMN browser_fingerprint TEXT;
        CREATE INDEX idx_website_snapshots_fingerprint ON website_snapshots(browser_fingerprint);
    END IF;
END $$;

-- Add fingerprint tracking to prompts table if it exists  
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'prompts') THEN
        ALTER TABLE prompts ADD COLUMN browser_fingerprint TEXT;
        CREATE INDEX idx_prompts_fingerprint ON prompts(browser_fingerprint);
    END IF;
END $$;