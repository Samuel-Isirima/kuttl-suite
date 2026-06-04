-- Migration 013: Add browser fingerprint support to website_customizations
-- Customization requests from end-users are identified by fingerprint, not user account.

ALTER TABLE website_customizations
  ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS website_id UUID REFERENCES websites(id) ON DELETE SET NULL,
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customizations_fingerprint ON website_customizations(browser_fingerprint);
CREATE INDEX IF NOT EXISTS idx_customizations_website_id  ON website_customizations(website_id);
