-- Migration: Create website_customizations table
-- This table stores user-requested changes and their implementation details

CREATE TABLE IF NOT EXISTS website_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    website_url TEXT NOT NULL,
    user_request TEXT NOT NULL,
    change_description TEXT NOT NULL,
    element_targeted TEXT NOT NULL,
    modification_type TEXT NOT NULL CHECK (modification_type IN (
        'Style & Content', 
        'Theme Change', 
        'Layout & Responsive', 
        'Brand Styling', 
        'Animation & Effects',
        'Content Update',
        'Functionality'
    )),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Applied', 'Testing', 'Pending', 'Failed')),
    applied_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Optional links to related data
    prompt_id UUID REFERENCES user_prompts(id) ON DELETE SET NULL,
    snapshot_id UUID REFERENCES website_snapshots(id) ON DELETE SET NULL,
    
    -- Indexes for common queries
    CONSTRAINT valid_applied_at CHECK (
        (status = 'Applied' AND applied_at IS NOT NULL) OR 
        (status != 'Applied')
    )
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_customizations_user_id ON website_customizations(user_id);
CREATE INDEX IF NOT EXISTS idx_customizations_status ON website_customizations(status);
CREATE INDEX IF NOT EXISTS idx_customizations_created_at ON website_customizations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customizations_website_url ON website_customizations(website_url);
CREATE INDEX IF NOT EXISTS idx_customizations_modification_type ON website_customizations(modification_type);

-- Update trigger for updated_at
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

-- Insert some sample data for testing
INSERT INTO website_customizations (user_id, website_url, user_request, change_description, element_targeted, modification_type, status, applied_at) 
SELECT 
    u.id as user_id,
    'acmecorp.com',
    'Make the header background blue and add a cart icon',
    'Changed header background from white (#ffffff) to blue (#2563eb), added cart icon next to user profile',
    'header.main-navigation',
    'Style & Content',
    'Applied',
    NOW() - INTERVAL '5 minutes'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO website_customizations (user_id, website_url, user_request, change_description, element_targeted, modification_type, status, applied_at) 
SELECT 
    u.id as user_id,
    'techstart.blog',
    'Switch the entire blog to dark mode theme',
    'Applied dark theme: background #1a1a1a, text #ffffff, cards #2d2d2d with borders',
    'body, .post-card, .sidebar',
    'Theme Change',
    'Applied',
    NOW() - INTERVAL '2 hours'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO website_customizations (user_id, website_url, user_request, change_description, element_targeted, modification_type, status, applied_at) 
SELECT 
    u.id as user_id,
    'dashboard.buildco.com',
    'Make the dashboard mobile-responsive with collapsible sidebar',
    'Added responsive breakpoints, sidebar collapses on mobile, adjusted grid layout for smaller screens',
    '.dashboard-container, .sidebar, .main-content',
    'Layout & Responsive',
    'Testing',
    NOW() - INTERVAL '1 day'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO website_customizations (user_id, website_url, user_request, change_description, element_targeted, modification_type, status) 
SELECT 
    u.id as user_id,
    'designstudio.agency',
    'Style the contact form to match our brand colors',
    'Updated form styling: primary color #ff6b35, rounded corners, custom button hover effects',
    '#contact-form, .form-button, .input-field',
    'Brand Styling',
    'Pending'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;

INSERT INTO website_customizations (user_id, website_url, user_request, change_description, element_targeted, modification_type, status, applied_at) 
SELECT 
    u.id as user_id,
    'startupxyz.com',
    'Add animated hover effects to all premium feature buttons',
    'Added CSS animations: scale(1.05) on hover, 0.3s transition, subtle glow effect for premium buttons',
    '.premium-button, .upgrade-btn',
    'Animation & Effects',
    'Applied',
    NOW() - INTERVAL '30 minutes'
FROM users u 
WHERE u.email = 'j.kief@kuttl.xyz'
ON CONFLICT DO NOTHING;