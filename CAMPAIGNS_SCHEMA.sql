-- =====================================================
-- CAMPAIGN SYSTEM - DATABASE SCHEMA
-- Phases 2-3: Campaign Creation & Scheduled Sending
-- =====================================================

-- 1. CAMPAIGNS TABLE
-- Stores promotional campaign configurations
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Template and targeting
  template_id UUID REFERENCES notification_templates(id),
  target_segments TEXT[] DEFAULT '{}', -- Array of segment names
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'completed', 'cancelled', 'failed')),
  
  -- Channel
  channel TEXT DEFAULT 'sms' CHECK (channel IN ('sms', 'email', 'both')),
  
  -- Statistics
  target_count INTEGER DEFAULT 0, -- How many customers to send to
  sent_count INTEGER DEFAULT 0, -- How many actually sent
  delivered_count INTEGER DEFAULT 0, -- How many delivered
  failed_count INTEGER DEFAULT 0, -- How many failed
  
  -- Cost tracking
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2) DEFAULT 0,
  cost_per_message DECIMAL(10,2) DEFAULT 2.00, -- LKR per SMS/Email
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);

-- 2. CAMPAIGN SENDS TABLE
-- Tracks individual message sends per campaign
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  
  -- Send details
  channel TEXT NOT NULL, -- sms, email, or both
  message_content TEXT, -- Actual message sent (with variables replaced)
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_sends_campaign ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_customer ON campaign_sends(customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_sends_status ON campaign_sends(status);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view campaigns"
  ON campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner/Manager can manage campaigns"
  ON campaigns FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

ALTER TABLE campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view campaign sends"
  ON campaign_sends FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can manage campaign sends"
  ON campaign_sends FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get target customers for a campaign
CREATE OR REPLACE FUNCTION get_campaign_targets(campaign_id_param UUID)
RETURNS TABLE (
  customer_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT
) AS $$
DECLARE
  target_segs TEXT[];
BEGIN
  -- Get target segments for this campaign
  SELECT target_segments INTO target_segs
  FROM campaigns
  WHERE id = campaign_id_param;
  
  -- Return customers that match ANY of the target segments
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.phone
  FROM customers c
  WHERE c.segment_tags && target_segs -- Overlaps operator
  AND c.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats(campaign_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET 
    sent_count = (
      SELECT COUNT(*) 
      FROM campaign_sends 
      WHERE campaign_id = campaign_id_param 
      AND status IN ('sent', 'delivered')
    ),
    delivered_count = (
      SELECT COUNT(*) 
      FROM campaign_sends 
      WHERE campaign_id = campaign_id_param 
      AND status = 'delivered'
    ),
    failed_count = (
      SELECT COUNT(*) 
      FROM campaign_sends 
      WHERE campaign_id = campaign_id_param 
      AND status = 'failed'
    ),
    actual_cost = (
      SELECT COUNT(*) * cost_per_message
      FROM campaign_sends 
      WHERE campaign_id = campaign_id_param 
      AND status IN ('sent', 'delivered')
    ),
    updated_at = NOW()
  WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update campaign stats
CREATE OR REPLACE FUNCTION trigger_update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_campaign_stats(NEW.campaign_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_sends_update_stats
  AFTER INSERT OR UPDATE ON campaign_sends
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_campaign_stats();

-- =====================================================
-- NOTES
-- =====================================================

-- After running this migration:
-- 1. Campaigns can be created and scheduled
-- 2. System will track all sends and their status
-- 3. Statistics are automatically updated
-- 4. Ready for Phase 3 (pg_cron scheduled sending)
