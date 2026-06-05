-- Website Snapshots and Embeddings Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- Website Snapshots
-- ─────────────────────────────────────────────

CREATE TABLE website_snapshots (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id       VARCHAR(255) NOT NULL,
    browser_client_id TEXT REFERENCES browser_clients(id) ON DELETE SET NULL,
    version          VARCHAR(255) NOT NULL,

    -- Serialized website state
    components      JSONB NOT NULL DEFAULT '[]'::jsonb,
    styles          JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout          JSONB NOT NULL DEFAULT '{}'::jsonb,
    customizations  JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Prompt tracking
    prompt_id    UUID,
    trigger_type VARCHAR(50) DEFAULT 'manual',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Snapshot Diffs
-- ─────────────────────────────────────────────

CREATE TABLE snapshot_diffs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_snapshot UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    to_snapshot   UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id    VARCHAR(255) NOT NULL,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_version  VARCHAR(255) NOT NULL,
    to_version    VARCHAR(255) NOT NULL,

    components      JSONB NOT NULL DEFAULT '{}'::jsonb,
    styles          JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout          JSONB NOT NULL DEFAULT '{}'::jsonb,
    customizations  JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Embedding Vectors
-- ─────────────────────────────────────────────

CREATE TABLE embedding_vectors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id  VARCHAR(255) NOT NULL,

    vector_type VARCHAR(50)  NOT NULL,
    target_id   VARCHAR(255) NOT NULL,

    vector      JSONB    NOT NULL,
    dimensions  INTEGER  NOT NULL,
    model       VARCHAR(100) NOT NULL,
    token_count INTEGER  DEFAULT 0,

    content  TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- AI Processing Jobs
-- ─────────────────────────────────────────────

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE ai_processing_jobs (
    id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type  VARCHAR(50) NOT NULL,

    snapshot_id UUID REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id  VARCHAR(255) NOT NULL,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    config     JSONB DEFAULT '{}'::jsonb,
    input_data JSONB DEFAULT '{}'::jsonb,

    status        job_status DEFAULT 'pending',
    progress      INTEGER DEFAULT 0,
    error_message TEXT,
    result        JSONB,

    started_at   TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

CREATE INDEX idx_website_snapshots_website_id      ON website_snapshots(website_id);
CREATE INDEX idx_website_snapshots_browser_client  ON website_snapshots(browser_client_id);
CREATE INDEX idx_website_snapshots_created         ON website_snapshots(created_at DESC);

CREATE INDEX idx_snapshot_diffs_from_to  ON snapshot_diffs(from_snapshot, to_snapshot);
CREATE INDEX idx_snapshot_diffs_website  ON snapshot_diffs(website_id, created_at DESC);

CREATE INDEX idx_embedding_vectors_snapshot      ON embedding_vectors(snapshot_id);
CREATE INDEX idx_embedding_vectors_website_type  ON embedding_vectors(website_id, vector_type);
CREATE INDEX idx_embedding_vectors_target        ON embedding_vectors(target_id);

CREATE INDEX idx_ai_jobs_type_status ON ai_processing_jobs(job_type, status);
CREATE INDEX idx_ai_jobs_website     ON ai_processing_jobs(website_id);
CREATE INDEX idx_ai_jobs_created     ON ai_processing_jobs(created_at DESC);

CREATE INDEX idx_snapshots_components_gin  ON website_snapshots USING gin(components);
CREATE INDEX idx_snapshots_metadata_gin    ON website_snapshots USING gin(metadata);
CREATE INDEX idx_embeddings_metadata_gin   ON embedding_vectors  USING gin(metadata);

-- ─────────────────────────────────────────────
-- Functions and Triggers
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_snapshots_updated_at
    BEFORE UPDATE ON website_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────
-- Views
-- ─────────────────────────────────────────────

CREATE VIEW latest_website_snapshots AS
SELECT DISTINCT ON (website_id)
    id,
    website_id,
    browser_client_id,
    version,
    jsonb_array_length(components)                AS component_count,
    jsonb_array_length(customizations->'patches') AS patch_count,
    created_at
FROM website_snapshots
ORDER BY website_id, created_at DESC;

CREATE VIEW embedding_statistics AS
SELECT
    website_id,
    vector_type,
    model,
    COUNT(*)         AS vector_count,
    AVG(dimensions)  AS avg_dimensions,
    AVG(token_count) AS avg_tokens,
    MIN(created_at)  AS first_created,
    MAX(created_at)  AS last_created
FROM embedding_vectors
GROUP BY website_id, vector_type, model;

CREATE VIEW active_ai_jobs AS
SELECT
    id, job_type, website_id, user_id, status, progress, created_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) AS duration_seconds
FROM ai_processing_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at ASC;
