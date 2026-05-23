-- Add prompt storage and tracking
-- This migration adds support for storing user prompts and linking them to snapshots and embeddings

-- ─────────────────────────────────────────────
-- User Prompts
-- ─────────────────────────────────────────────

CREATE TABLE user_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    website_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    
    -- Prompt content
    prompt_text TEXT NOT NULL,
    prompt_type VARCHAR(50) DEFAULT 'ai_modification', -- 'ai_modification', 'ai_query', 'manual_change'
    prompt_language VARCHAR(10) DEFAULT 'en',
    
    -- Context at time of prompt
    selected_element_uid VARCHAR(255), -- Element user had selected when prompting
    page_url TEXT,
    user_agent TEXT,
    
    -- Results and tracking
    snapshot_id UUID REFERENCES website_snapshots(id), -- Snapshot created from this prompt
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Store additional context like device info, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Prompt Results
-- ─────────────────────────────────────────────

CREATE TABLE prompt_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES user_prompts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- AI response details
    ai_provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'gemini'
    ai_model VARCHAR(100) NOT NULL,
    response_time_ms INTEGER,
    token_count INTEGER DEFAULT 0,
    
    -- Generated content
    raw_response TEXT NOT NULL,
    patches_applied JSONB DEFAULT '[]'::jsonb, -- Array of patches that were applied
    warnings JSONB DEFAULT '[]'::jsonb,
    
    -- Quality metrics
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    user_satisfaction INTEGER, -- 1-5 rating (to be set later by user feedback)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Link prompts to embeddings
-- ─────────────────────────────────────────────

-- Add prompt tracking to embedding_vectors table
ALTER TABLE embedding_vectors 
ADD COLUMN prompt_id UUID REFERENCES user_prompts(id);

-- Add prompt context to website_snapshots table
ALTER TABLE website_snapshots 
ADD COLUMN prompt_id UUID REFERENCES user_prompts(id),
ADD COLUMN trigger_type VARCHAR(50) DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'ai_prompt', 'auto_sync'));

-- ─────────────────────────────────────────────
-- Indexes for performance
-- ─────────────────────────────────────────────

-- User prompts indexes
CREATE INDEX idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX idx_user_prompts_website_id ON user_prompts(website_id);
CREATE INDEX idx_user_prompts_session_id ON user_prompts(session_id);
CREATE INDEX idx_user_prompts_created_at ON user_prompts(created_at DESC);
CREATE INDEX idx_user_prompts_website_user_created ON user_prompts(website_id, user_id, created_at DESC);

-- Prompt results indexes
CREATE INDEX idx_prompt_results_prompt_id ON prompt_results(prompt_id);
CREATE INDEX idx_prompt_results_user_id ON prompt_results(user_id);
CREATE INDEX idx_prompt_results_ai_provider ON prompt_results(ai_provider);
CREATE INDEX idx_prompt_results_created_at ON prompt_results(created_at DESC);

-- Updated embedding vectors indexes
CREATE INDEX idx_embedding_vectors_prompt_id ON embedding_vectors(prompt_id);
CREATE INDEX idx_website_snapshots_prompt_id ON website_snapshots(prompt_id);

-- ─────────────────────────────────────────────
-- Updated triggers
-- ─────────────────────────────────────────────

-- Add updated_at trigger for user_prompts (though prompts shouldn't typically be updated)
CREATE TRIGGER update_user_prompts_updated_at BEFORE UPDATE ON user_prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();