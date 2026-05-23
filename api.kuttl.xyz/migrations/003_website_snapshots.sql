-- Website Snapshots and Embeddings Schema
-- This migration adds support for website state serialization and AI embeddings

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "vector";  -- For pgvector if available, otherwise we'll use JSONB

-- ─────────────────────────────────────────────
-- Website Snapshots
-- ─────────────────────────────────────────────

CREATE TABLE website_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    version VARCHAR(255) NOT NULL,
    
    -- Serialized website state
    components JSONB NOT NULL DEFAULT '[]'::jsonb,
    styles JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    customizations JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Snapshot Diffs
-- ─────────────────────────────────────────────

CREATE TABLE snapshot_diffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_snapshot UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    to_snapshot UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_version VARCHAR(255) NOT NULL,
    to_version VARCHAR(255) NOT NULL,
    
    -- Diff data
    components JSONB NOT NULL DEFAULT '{}'::jsonb,
    styles JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    customizations JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Embedding Vectors
-- ─────────────────────────────────────────────

CREATE TABLE embedding_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Vector metadata
    vector_type VARCHAR(50) NOT NULL, -- 'full', 'component', 'style', 'layout'
    target_id VARCHAR(255) NOT NULL,  -- component UID or snapshot ID
    
    -- Vector data (using JSONB array for compatibility)
    vector JSONB NOT NULL,           -- Array of floats
    dimensions INTEGER NOT NULL,
    model VARCHAR(100) NOT NULL,
    token_count INTEGER DEFAULT 0,
    
    -- Content and metadata
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Website Context Cache
-- ─────────────────────────────────────────────

CREATE TABLE website_contexts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Aggregated context for AI
    context_summary TEXT NOT NULL,
    component_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    style_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    customization_intent JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Context metadata
    last_snapshot_id UUID REFERENCES website_snapshots(id),
    context_version VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- AI Processing Jobs
-- ─────────────────────────────────────────────

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE ai_processing_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type VARCHAR(50) NOT NULL, -- 'embed_snapshot', 'generate_context', 'process_diff'
    
    -- Job data
    snapshot_id UUID REFERENCES website_snapshots(id) ON DELETE CASCADE,
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Job configuration
    config JSONB DEFAULT '{}'::jsonb,
    input_data JSONB DEFAULT '{}'::jsonb,
    
    -- Job status
    status job_status DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    result JSONB,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes for Performance
-- ─────────────────────────────────────────────

-- Website snapshots
CREATE INDEX idx_website_snapshots_website_user ON website_snapshots(website_id, user_id);
CREATE INDEX idx_website_snapshots_session ON website_snapshots(session_id);
CREATE INDEX idx_website_snapshots_created ON website_snapshots(created_at DESC);
CREATE INDEX idx_website_snapshots_version ON website_snapshots(website_id, version);

-- Snapshot diffs
CREATE INDEX idx_snapshot_diffs_from_to ON snapshot_diffs(from_snapshot, to_snapshot);
CREATE INDEX idx_snapshot_diffs_website ON snapshot_diffs(website_id, created_at DESC);
CREATE INDEX idx_snapshot_diffs_user ON snapshot_diffs(user_id, created_at DESC);

-- Embedding vectors
CREATE INDEX idx_embedding_vectors_snapshot ON embedding_vectors(snapshot_id);
CREATE INDEX idx_embedding_vectors_website_type ON embedding_vectors(website_id, vector_type);
CREATE INDEX idx_embedding_vectors_target ON embedding_vectors(target_id);
CREATE INDEX idx_embedding_vectors_model ON embedding_vectors(model, dimensions);

-- Website contexts
CREATE INDEX idx_website_contexts_website_user ON website_contexts(website_id, user_id);
CREATE INDEX idx_website_contexts_snapshot ON website_contexts(last_snapshot_id);
CREATE INDEX idx_website_contexts_expires ON website_contexts(expires_at) WHERE expires_at IS NOT NULL;

-- AI processing jobs
CREATE INDEX idx_ai_jobs_type_status ON ai_processing_jobs(job_type, status);
CREATE INDEX idx_ai_jobs_website ON ai_processing_jobs(website_id);
CREATE INDEX idx_ai_jobs_created ON ai_processing_jobs(created_at DESC);
CREATE INDEX idx_ai_jobs_snapshot ON ai_processing_jobs(snapshot_id) WHERE snapshot_id IS NOT NULL;

-- JSONB indexes for common queries
CREATE INDEX idx_snapshots_components_gin ON website_snapshots USING gin(components);
CREATE INDEX idx_snapshots_metadata_gin ON website_snapshots USING gin(metadata);
CREATE INDEX idx_embeddings_metadata_gin ON embedding_vectors USING gin(metadata);
CREATE INDEX idx_contexts_component_map_gin ON website_contexts USING gin(component_map);

-- ─────────────────────────────────────────────
-- Functions and Triggers
-- ─────────────────────────────────────────────

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_website_snapshots_updated_at
    BEFORE UPDATE ON website_snapshots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_contexts_updated_at
    BEFORE UPDATE ON website_contexts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-expire old contexts
CREATE OR REPLACE FUNCTION expire_old_contexts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    DELETE FROM website_contexts 
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get website context summary
CREATE OR REPLACE FUNCTION get_website_context_summary(
    p_website_id VARCHAR(255),
    p_user_id UUID
)
RETURNS JSONB AS $$
DECLARE
    context_data JSONB;
    latest_snapshot RECORD;
    total_components INTEGER;
    total_customizations INTEGER;
BEGIN
    -- Get the latest snapshot info
    SELECT s.id, s.version, s.created_at, 
           jsonb_array_length(s.components) as component_count,
           jsonb_array_length(s.customizations->'patches') as patch_count
    INTO latest_snapshot
    FROM website_snapshots s
    WHERE s.website_id = p_website_id AND s.user_id = p_user_id
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- Get total counts
    SELECT 
        COALESCE(SUM(jsonb_array_length(components)), 0),
        COALESCE(SUM(jsonb_array_length(customizations->'patches')), 0)
    INTO total_components, total_customizations
    FROM website_snapshots
    WHERE website_id = p_website_id AND user_id = p_user_id;
    
    -- Build context summary
    context_data = jsonb_build_object(
        'website_id', p_website_id,
        'user_id', p_user_id,
        'latest_snapshot', jsonb_build_object(
            'id', latest_snapshot.id,
            'version', latest_snapshot.version,
            'created_at', latest_snapshot.created_at,
            'component_count', latest_snapshot.component_count,
            'patch_count', latest_snapshot.patch_count
        ),
        'totals', jsonb_build_object(
            'components', total_components,
            'customizations', total_customizations,
            'snapshots', (
                SELECT COUNT(*) FROM website_snapshots 
                WHERE website_id = p_website_id AND user_id = p_user_id
            )
        ),
        'generated_at', CURRENT_TIMESTAMP
    );
    
    RETURN context_data;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Views for Common Queries
-- ─────────────────────────────────────────────

-- Latest snapshots per website
CREATE VIEW latest_website_snapshots AS
SELECT DISTINCT ON (website_id, user_id)
    id,
    website_id,
    user_id,
    session_id,
    version,
    jsonb_array_length(components) as component_count,
    jsonb_array_length(customizations->'patches') as patch_count,
    ((metadata->'performance_metrics'->>'capture_time'))::float as capture_time_ms,
    created_at
FROM website_snapshots
ORDER BY website_id, user_id, created_at DESC;

-- Embedding statistics
CREATE VIEW embedding_statistics AS
SELECT 
    website_id,
    user_id,
    vector_type,
    model,
    COUNT(*) as vector_count,
    AVG(dimensions) as avg_dimensions,
    AVG(token_count) as avg_tokens,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created
FROM embedding_vectors
GROUP BY website_id, user_id, vector_type, model;

-- Active AI jobs
CREATE VIEW active_ai_jobs AS
SELECT 
    id,
    job_type,
    website_id,
    user_id,
    status,
    progress,
    created_at,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) as duration_seconds
FROM ai_processing_jobs
WHERE status IN ('pending', 'processing')
ORDER BY created_at ASC;

-- ─────────────────────────────────────────────
-- Sample Data and Comments
-- ─────────────────────────────────────────────

COMMENT ON TABLE website_snapshots IS 'Complete website state snapshots with components, styles, layout, and customizations';
COMMENT ON TABLE snapshot_diffs IS 'Incremental differences between website snapshots for efficient updates';
COMMENT ON TABLE embedding_vectors IS 'AI embeddings for website components and states, used for context-aware customization';
COMMENT ON TABLE website_contexts IS 'Cached website context summaries for faster AI processing';
COMMENT ON TABLE ai_processing_jobs IS 'Background jobs for AI processing of website data';

COMMENT ON COLUMN website_snapshots.website_id IS 'External identifier for the website being tracked';
COMMENT ON COLUMN website_snapshots.components IS 'JSONB array of serialized component states';
COMMENT ON COLUMN website_snapshots.styles IS 'JSONB object containing CSS rules and design tokens';
COMMENT ON COLUMN website_snapshots.layout IS 'JSONB object describing layout containers and positioning';
COMMENT ON COLUMN website_snapshots.customizations IS 'JSONB object with patches and customization history';
COMMENT ON COLUMN website_snapshots.metadata IS 'JSONB object with capture metadata and performance metrics';

COMMENT ON COLUMN embedding_vectors.vector_type IS 'Type of embedding: full (entire snapshot), component (single component), style (style section), layout (layout section)';
COMMENT ON COLUMN embedding_vectors.target_id IS 'ID of the target being embedded (component UID or snapshot ID)';
COMMENT ON COLUMN embedding_vectors.vector IS 'JSONB array of embedding vector values';
COMMENT ON COLUMN embedding_vectors.content IS 'Original text content that was embedded';