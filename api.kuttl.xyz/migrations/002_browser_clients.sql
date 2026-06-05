-- Migration 002: Browser clients
-- A browser_client represents a browser/device visiting a customer's website.
-- Its identity IS its fingerprint — no separate surrogate key.

CREATE TABLE browser_clients (
    id            TEXT PRIMARY KEY, -- the browser fingerprint
    website_hash  TEXT NOT NULL,    -- the website hash key it was first seen on
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_browser_clients_website_hash ON browser_clients(website_hash);
