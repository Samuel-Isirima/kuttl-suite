-- Dashboard Metrics Tables

-- ─────────────────────────────────────────────
-- User Statistics (aggregated per kuttl account)
-- ─────────────────────────────────────────────

CREATE TABLE user_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    total_snapshots            INTEGER DEFAULT 0,
    total_websites             INTEGER DEFAULT 0,
    total_api_requests         INTEGER DEFAULT 0,
    total_customizations       INTEGER DEFAULT 0,
    snapshots_this_month       INTEGER DEFAULT 0,
    api_requests_this_month    INTEGER DEFAULT 0,
    customizations_this_month  INTEGER DEFAULT 0,

    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- API Request Logs
-- ─────────────────────────────────────────────

CREATE TABLE api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    endpoint        VARCHAR(255) NOT NULL,
    method          VARCHAR(10)  NOT NULL,
    status_code     INTEGER      NOT NULL,
    response_time_ms INTEGER,
    ip_address      INET,
    user_agent      TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────

CREATE UNIQUE INDEX idx_user_statistics_user_id     ON user_statistics(user_id);
CREATE INDEX idx_user_statistics_last_calculated    ON user_statistics(last_calculated_at);
CREATE INDEX idx_api_request_logs_user_id           ON api_request_logs(user_id);
CREATE INDEX idx_api_request_logs_created_at        ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_endpoint          ON api_request_logs(endpoint);

-- ─────────────────────────────────────────────
-- Views
-- ─────────────────────────────────────────────

CREATE VIEW user_dashboard_metrics AS
SELECT
    u.id    AS user_id,
    u.name,
    u.email,
    COALESCE(us.total_snapshots, 0)           AS total_snapshots,
    COALESCE(us.total_websites, 0)            AS total_websites,
    COALESCE(us.total_api_requests, 0)        AS total_api_requests,
    COALESCE(us.total_customizations, 0)      AS total_customizations,
    COALESCE(us.snapshots_this_month, 0)      AS snapshots_this_month,
    COALESCE(us.api_requests_this_month, 0)   AS api_requests_this_month,
    COALESCE(us.customizations_this_month, 0) AS customizations_this_month,
    us.last_calculated_at
FROM users u
LEFT JOIN user_statistics us ON u.id = us.user_id;

-- Recent snapshot activity (no user identity — snapshots are owned by browser clients)
CREATE VIEW recent_snapshot_activity AS
SELECT
    ws.website_id,
    ws.browser_client_id,
    ws.created_at                                                   AS snapshot_created_at,
    jsonb_array_length(ws.components)                               AS component_count,
    jsonb_array_length(COALESCE(ws.customizations->'patches', '[]'::jsonb)) AS customization_count
FROM website_snapshots ws
WHERE ws.created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
ORDER BY ws.created_at DESC
LIMIT 100;

-- ─────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────

CREATE TRIGGER update_user_statistics_updated_at
    BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
