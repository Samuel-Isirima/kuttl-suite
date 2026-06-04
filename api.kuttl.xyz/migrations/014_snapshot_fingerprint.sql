-- Migration 014: Add browser fingerprint to website_snapshots
ALTER TABLE website_snapshots
  ADD COLUMN IF NOT EXISTS browser_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_snapshots_fingerprint
  ON website_snapshots(browser_fingerprint)
  WHERE browser_fingerprint IS NOT NULL;
