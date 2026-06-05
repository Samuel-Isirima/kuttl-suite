-- Migration 004: Customization prompts and results

-- ─────────────────────────────────────────────
-- Customization Prompts
-- ─────────────────────────────────────────────

CREATE TABLE customization_prompts (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    website_id           VARCHAR(255) NOT NULL,
    website_hash         TEXT,
    browser_client_id    TEXT REFERENCES browser_clients(id) ON DELETE SET NULL,

    prompt_text          TEXT NOT NULL,
    prompt_type          VARCHAR(50) DEFAULT 'ai_modification',

    selected_element_uid VARCHAR(255),
    page_url             TEXT,
    user_agent           TEXT,

    success              BOOLEAN DEFAULT TRUE,
    error_message        TEXT,

    created_at           TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Customization Prompt Results
-- ─────────────────────────────────────────────

CREATE TABLE customization_prompt_results (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id         UUID NOT NULL REFERENCES customization_prompts(id) ON DELETE CASCADE,
    website_hash      TEXT,
    browser_client_id TEXT REFERENCES browser_clients(id) ON DELETE SET NULL,

    ai_provider       VARCHAR(50)  NOT NULL,
    ai_model          VARCHAR(100) NOT NULL,
    response_time_ms  INTEGER,
    token_count       INTEGER DEFAULT 0,

    raw_response      TEXT NOT NULL,
    patches_applied   JSONB DEFAULT '[]'::jsonb,
    warnings          JSONB DEFAULT '[]'::jsonb,

    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Link prompts to embedding_vectors
-- ─────────────────────────────────────────────

ALTER TABLE embedding_vectors
    ADD COLUMN prompt_id UUID REFERENCES customization_prompts(id);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

CREATE INDEX idx_customization_prompts_user_id         ON customization_prompts(user_id);
CREATE INDEX idx_customization_prompts_website_id      ON customization_prompts(website_id);
CREATE INDEX idx_customization_prompts_website_hash    ON customization_prompts(website_hash);
CREATE INDEX idx_customization_prompts_browser_client  ON customization_prompts(browser_client_id);
CREATE INDEX idx_customization_prompts_created_at      ON customization_prompts(created_at DESC);

CREATE INDEX idx_customization_prompt_results_prompt_id      ON customization_prompt_results(prompt_id);
CREATE INDEX idx_customization_prompt_results_website_hash   ON customization_prompt_results(website_hash);
CREATE INDEX idx_customization_prompt_results_browser_client ON customization_prompt_results(browser_client_id);
CREATE INDEX idx_customization_prompt_results_ai_provider    ON customization_prompt_results(ai_provider);
CREATE INDEX idx_customization_prompt_results_created_at     ON customization_prompt_results(created_at DESC);

CREATE INDEX idx_embedding_vectors_prompt_id ON embedding_vectors(prompt_id);
CREATE INDEX idx_website_snapshots_prompt_id ON website_snapshots(prompt_id);
