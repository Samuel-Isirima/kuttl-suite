-- Add prompt tracking fields to api_calls table
-- This allows us to track the prompts sent to AI providers for each API call

ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS prompt_text TEXT;
ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS prompt_response TEXT;
ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS ai_provider TEXT;
ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS ai_model TEXT;
ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS patches_count INTEGER DEFAULT 0;
ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS success_status TEXT; -- 'ok', 'no_changes', 'error'

-- Index for efficient querying of prompts
CREATE INDEX IF NOT EXISTS idx_api_calls_prompt_text ON api_calls(user_id, prompt_text) WHERE prompt_text IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_calls_ai_provider ON api_calls(ai_provider) WHERE ai_provider IS NOT NULL;