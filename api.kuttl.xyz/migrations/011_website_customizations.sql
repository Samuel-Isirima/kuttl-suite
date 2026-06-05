-- Migration 011: Website customizations

CREATE TABLE website_customizations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity: widget requests use browser_client_id; dashboard requests use user_id
    browser_client_id TEXT REFERENCES browser_clients(id) ON DELETE SET NULL,
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Website linkage
    website_id        UUID,
    website_url       TEXT NOT NULL,

    -- Customization details
    user_request       TEXT NOT NULL,
    change_description TEXT NOT NULL,
    element_targeted   TEXT NOT NULL,
    modification_type  TEXT NOT NULL CHECK (modification_type IN (
        'Style & Content',
        'Theme Change',
        'Layout & Responsive',
        'Brand Styling',
        'Animation & Effects',
        'Content Update',
        'Functionality'
    )),

    status     TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Applied', 'Testing', 'Pending', 'Failed')),
    applied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Optional links to related data
    prompt_id   UUID,
    snapshot_id UUID REFERENCES website_snapshots(id) ON DELETE SET NULL,

    CONSTRAINT valid_applied_at CHECK (
        (status = 'Applied' AND applied_at IS NOT NULL) OR (status != 'Applied')
    )
);

CREATE INDEX idx_customizations_browser_client  ON website_customizations(browser_client_id);
CREATE INDEX idx_customizations_user_id         ON website_customizations(user_id);
CREATE INDEX idx_customizations_website_id      ON website_customizations(website_id);
CREATE INDEX idx_customizations_status          ON website_customizations(status);
CREATE INDEX idx_customizations_created_at      ON website_customizations(created_at DESC);
CREATE INDEX idx_customizations_website_url     ON website_customizations(website_url);
CREATE INDEX idx_customizations_modification_type ON website_customizations(modification_type);

CREATE OR REPLACE FUNCTION update_customizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_customizations_updated_at
    BEFORE UPDATE ON website_customizations
    FOR EACH ROW
    EXECUTE FUNCTION update_customizations_updated_at();
