-- Insert sample API call data for testing (only if no data exists)
-- This will be useful for development and testing

-- Note: This migration will only run if the api_calls table is empty
-- In production, you may want to skip this or remove it

INSERT INTO api_calls (
    id, user_id, api_key_id, ip_address, domain, referrer, action, 
    endpoint, method, status_code, response_time_ms, user_agent, device_type, 
    timestamp, created_at
)
SELECT 
    gen_random_uuid(),
    u.id as user_id,
    at.id as api_key_id,
    CASE (random() * 10)::int
        WHEN 0 THEN '192.168.1.100'
        WHEN 1 THEN '10.0.0.50'
        WHEN 2 THEN '172.16.0.25'
        WHEN 3 THEN '203.0.113.12'
        WHEN 4 THEN '198.51.100.33'
        WHEN 5 THEN '192.0.2.44'
        WHEN 6 THEN '203.0.113.55'
        WHEN 7 THEN '198.51.100.66'
        WHEN 8 THEN '192.0.2.77'
        ELSE '203.0.113.88'
    END as ip_address,
    CASE (random() * 5)::int
        WHEN 0 THEN 'example.com'
        WHEN 1 THEN 'mywebsite.io'
        WHEN 2 THEN 'testdomain.org'
        WHEN 3 THEN 'localhost:3000'
        ELSE 'demo.kuttl.xyz'
    END as domain,
    CASE (random() * 3)::int
        WHEN 0 THEN 'https://google.com/search'
        WHEN 1 THEN 'https://github.com/project'
        ELSE 'https://docs.kuttl.xyz'
    END as referrer,
    CASE (random() * 3)::int
        WHEN 0 THEN 'prompt'
        WHEN 1 THEN 'snapshot'
        ELSE 'customization'
    END as action,
    CASE (random() * 4)::int
        WHEN 0 THEN '/api/v1/snapshots'
        WHEN 1 THEN '/api/prompt'
        WHEN 2 THEN '/api/v1/snapshots/search'
        ELSE '/api/v1/snapshots/diffs'
    END as endpoint,
    CASE (random() * 3)::int
        WHEN 0 THEN 'GET'
        WHEN 1 THEN 'POST'
        ELSE 'PUT'
    END as method,
    CASE (random() * 10)::int
        WHEN 0 THEN 400
        WHEN 1 THEN 404
        WHEN 2 THEN 500
        WHEN 9 THEN 429
        ELSE 200
    END as status_code,
    (50 + random() * 500)::int as response_time_ms,
    CASE (random() * 3)::int
        WHEN 0 THEN 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        WHEN 1 THEN 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
        ELSE 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    END as user_agent,
    CASE (random() * 3)::int
        WHEN 0 THEN 'mobile'
        WHEN 1 THEN 'tablet'
        ELSE 'desktop'
    END as device_type,
    NOW() - (random() * interval '30 days') as timestamp,
    NOW() - (random() * interval '30 days') as created_at
FROM users u
CROSS JOIN api_tokens at
WHERE u.id = at.user_id
  AND NOT EXISTS (SELECT 1 FROM api_calls LIMIT 1) -- Only if table is empty
  AND EXISTS (SELECT 1 FROM api_tokens LIMIT 1) -- Only if we have API tokens
LIMIT 100; -- Generate 100 sample entries per user/token combination

-- Add some recent data for better testing
INSERT INTO api_calls (
    id, user_id, api_key_id, ip_address, domain, referrer, action, 
    endpoint, method, status_code, response_time_ms, user_agent, device_type, 
    timestamp, created_at
)
SELECT 
    gen_random_uuid(),
    u.id as user_id,
    at.id as api_key_id,
    '192.168.1.' || (100 + (random() * 50)::int) as ip_address,
    'example.com' as domain,
    'https://docs.kuttl.xyz' as referrer,
    CASE (random() * 3)::int
        WHEN 0 THEN 'prompt'
        WHEN 1 THEN 'snapshot'
        ELSE 'customization'
    END as action,
    '/api/v1/snapshots' as endpoint,
    'POST' as method,
    200 as status_code,
    (100 + random() * 200)::int as response_time_ms,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36' as user_agent,
    'desktop' as device_type,
    NOW() - (random() * interval '24 hours') as timestamp,
    NOW() - (random() * interval '24 hours') as created_at
FROM users u
CROSS JOIN api_tokens at
WHERE u.id = at.user_id
  AND EXISTS (SELECT 1 FROM api_tokens LIMIT 1) -- Only if we have API tokens
LIMIT 20; -- Generate 20 recent entries