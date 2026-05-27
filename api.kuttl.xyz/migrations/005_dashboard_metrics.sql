-- Dashboard Metrics Tables
-- This migration adds tables for tracking dashboard metrics and analytics

-- ─────────────────────────────────────────────
-- User Statistics (aggregated metrics per user)
-- ─────────────────────────────────────────────

CREATE TABLE user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Snapshot metrics
    total_snapshots INTEGER DEFAULT 0,
    total_websites INTEGER DEFAULT 0,
    total_api_requests INTEGER DEFAULT 0,
    total_customizations INTEGER DEFAULT 0,
    
    -- Monthly metrics
    snapshots_this_month INTEGER DEFAULT 0,
    api_requests_this_month INTEGER DEFAULT 0,
    customizations_this_month INTEGER DEFAULT 0,
    
    -- Last calculated
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- API Request Logs (for tracking usage)
-- ─────────────────────────────────────────────

CREATE TABLE api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Website Analytics (per website metrics)
-- ─────────────────────────────────────────────

CREATE TABLE website_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Snapshot counts
    total_snapshots INTEGER DEFAULT 0,
    snapshots_this_month INTEGER DEFAULT 0,
    
    -- Component counts
    total_components INTEGER DEFAULT 0,
    unique_component_types INTEGER DEFAULT 0,
    
    -- Customization counts
    total_customizations INTEGER DEFAULT 0,
    customizations_this_month INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_snapshot_time_ms FLOAT,
    avg_components_per_snapshot INTEGER,
    
    -- Last snapshot info
    last_snapshot_at TIMESTAMP WITH TIME ZONE,
    last_version VARCHAR(255),
    
    -- Timestamps
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes for Performance
-- ─────────────────────────────────────────────

-- User statistics
CREATE UNIQUE INDEX idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX idx_user_statistics_last_calculated ON user_statistics(last_calculated_at);

-- API request logs
CREATE INDEX idx_api_request_logs_user_id ON api_request_logs(user_id);
CREATE INDEX idx_api_request_logs_created_at ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint ON api_request_logs(endpoint);
CREATE INDEX idx_api_request_logs_user_created ON api_request_logs(user_id, created_at DESC);

-- Website analytics
CREATE UNIQUE INDEX idx_website_analytics_website_user ON website_analytics(website_id, user_id);
CREATE INDEX idx_website_analytics_user_id ON website_analytics(user_id);
CREATE INDEX idx_website_analytics_last_calculated ON website_analytics(last_calculated_at);

-- ─────────────────────────────────────────────
-- Functions for Calculating Metrics
-- ─────────────────────────────────────────────

-- Function to calculate user statistics
CREATE OR REPLACE FUNCTION calculate_user_statistics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    stats_record user_statistics%ROWTYPE;
    current_month_start TIMESTAMP WITH TIME ZONE;
BEGIN
    current_month_start := date_trunc('month', CURRENT_TIMESTAMP);
    
    -- Calculate metrics
    SELECT 
        p_user_id,
        COUNT(DISTINCT ws.id),
        COUNT(DISTINCT ws.website_id),
        COALESCE(SUM(
            CASE WHEN arl.created_at >= current_month_start 
            THEN 1 ELSE 0 END
        ), 0),
        COALESCE(SUM(
            jsonb_array_length(COALESCE(ws.customizations->'patches', '[]'::jsonb))
        ), 0),
        COUNT(DISTINCT CASE WHEN ws.created_at >= current_month_start THEN ws.id END),
        COALESCE(SUM(
            CASE WHEN arl.created_at >= current_month_start 
            THEN 1 ELSE 0 END
        ), 0),
        COALESCE(SUM(
            CASE WHEN ws.created_at >= current_month_start
            THEN jsonb_array_length(COALESCE(ws.customizations->'patches', '[]'::jsonb))
            ELSE 0 END
        ), 0),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    INTO 
        stats_record.user_id,
        stats_record.total_snapshots,
        stats_record.total_websites,
        stats_record.total_api_requests,
        stats_record.total_customizations,
        stats_record.snapshots_this_month,
        stats_record.api_requests_this_month,
        stats_record.customizations_this_month,
        stats_record.last_calculated_at,
        stats_record.created_at,
        stats_record.updated_at
    FROM website_snapshots ws
    LEFT JOIN api_request_logs arl ON arl.user_id = ws.user_id
    WHERE ws.user_id = p_user_id;
    
    -- Insert or update statistics
    INSERT INTO user_statistics (
        user_id, total_snapshots, total_websites, total_api_requests,
        total_customizations, snapshots_this_month, api_requests_this_month,
        customizations_this_month, last_calculated_at
    ) VALUES (
        p_user_id, 
        COALESCE(stats_record.total_snapshots, 0),
        COALESCE(stats_record.total_websites, 0),
        COALESCE(stats_record.total_api_requests, 0),
        COALESCE(stats_record.total_customizations, 0),
        COALESCE(stats_record.snapshots_this_month, 0),
        COALESCE(stats_record.api_requests_this_month, 0),
        COALESCE(stats_record.customizations_this_month, 0),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_snapshots = EXCLUDED.total_snapshots,
        total_websites = EXCLUDED.total_websites,
        total_api_requests = EXCLUDED.total_api_requests,
        total_customizations = EXCLUDED.total_customizations,
        snapshots_this_month = EXCLUDED.snapshots_this_month,
        api_requests_this_month = EXCLUDED.api_requests_this_month,
        customizations_this_month = EXCLUDED.customizations_this_month,
        last_calculated_at = EXCLUDED.last_calculated_at,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Function to log API requests
CREATE OR REPLACE FUNCTION log_api_request(
    p_user_id UUID,
    p_endpoint VARCHAR(255),
    p_method VARCHAR(10),
    p_status_code INTEGER,
    p_response_time_ms INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO api_request_logs (
        user_id, endpoint, method, status_code, response_time_ms,
        ip_address, user_agent
    ) VALUES (
        p_user_id, p_endpoint, p_method, p_status_code, p_response_time_ms,
        p_ip_address, p_user_agent
    );
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- Views for Dashboard Queries
-- ─────────────────────────────────────────────

-- User dashboard view
CREATE VIEW user_dashboard_metrics AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    COALESCE(us.total_snapshots, 0) as total_snapshots,
    COALESCE(us.total_websites, 0) as total_websites,
    COALESCE(us.total_api_requests, 0) as total_api_requests,
    COALESCE(us.total_customizations, 0) as total_customizations,
    COALESCE(us.snapshots_this_month, 0) as snapshots_this_month,
    COALESCE(us.api_requests_this_month, 0) as api_requests_this_month,
    COALESCE(us.customizations_this_month, 0) as customizations_this_month,
    us.last_calculated_at
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id;

-- Recent activity view
CREATE VIEW recent_user_activity AS
SELECT 
    ws.user_id,
    ws.website_id,
    ws.created_at as snapshot_created_at,
    jsonb_array_length(ws.components) as component_count,
    jsonb_array_length(COALESCE(ws.customizations->'patches', '[]'::jsonb)) as customization_count
FROM website_snapshots ws
WHERE ws.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY ws.created_at DESC
LIMIT 100;

-- ─────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────

-- Auto-update user statistics when new snapshots are created
CREATE OR REPLACE FUNCTION trigger_update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user statistics after snapshot operations
    PERFORM calculate_user_statistics(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_on_snapshot
    AFTER INSERT OR UPDATE ON website_snapshots
    FOR EACH ROW EXECUTE FUNCTION trigger_update_user_stats();

-- Updated_at triggers
CREATE TRIGGER update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_website_analytics_updated_at
    BEFORE UPDATE ON website_analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();