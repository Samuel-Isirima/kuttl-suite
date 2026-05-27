-- API Calls table for usage tracking
CREATE TABLE api_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key_id UUID NOT NULL REFERENCES api_tokens(id) ON DELETE CASCADE,
    ip_address TEXT NOT NULL,
    domain TEXT,
    referrer TEXT,
    action TEXT NOT NULL, -- 'prompt', 'snapshot', 'customization', etc.
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL, -- 'GET', 'POST', 'PUT', 'DELETE', etc.
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    user_agent TEXT,
    device_type TEXT, -- 'mobile', 'tablet', 'desktop'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_api_calls_user_id ON api_calls(user_id);
CREATE INDEX idx_api_calls_api_key_id ON api_calls(api_key_id);
CREATE INDEX idx_api_calls_timestamp ON api_calls(timestamp);
CREATE INDEX idx_api_calls_action ON api_calls(action);
CREATE INDEX idx_api_calls_user_timestamp ON api_calls(user_id, timestamp);
CREATE INDEX idx_api_calls_user_action ON api_calls(user_id, action);