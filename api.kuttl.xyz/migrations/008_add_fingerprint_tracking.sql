-- Add browser fingerprint tracking to API calls
ALTER TABLE api_calls ADD COLUMN browser_fingerprint TEXT;

-- Add index for fingerprint lookups
CREATE INDEX idx_api_calls_fingerprint ON api_calls(browser_fingerprint);
CREATE INDEX idx_api_calls_user_fingerprint ON api_calls(user_id, browser_fingerprint);

-- website_snapshots now uses browser_client_id (FK to browser_clients) instead of browser_fingerprint.