-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES notification_templates(id),
    target_segments TEXT[] DEFAULT '{}',
    scheduled_for TIMESTAMPTZ,
    status TEXT CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed')) DEFAULT 'draft',
    channel TEXT CHECK (channel IN ('sms', 'email', 'both')) DEFAULT 'email',
    target_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaign_sends table (for tracking individual sends)
CREATE TABLE IF NOT EXISTS campaign_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    channel TEXT CHECK (channel IN ('sms', 'email')),
    status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view campaigns" ON campaigns;
DROP POLICY IF EXISTS "Owners and Managers can manage campaigns" ON campaigns;
DROP POLICY IF EXISTS "Everyone can view campaign sends" ON campaign_sends;

-- Create policies for campaigns
CREATE POLICY "Everyone can view campaigns"
    ON campaigns FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Owners and Managers can manage campaigns"
    ON campaigns FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Owner', 'Manager')
        )
    );

-- Create policies for campaign_sends
CREATE POLICY "Everyone can view campaign sends"
    ON campaign_sends FOR SELECT
    TO authenticated
    USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign_id ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);
