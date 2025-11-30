-- =====================================================
-- SCHEDULED SENDING SYSTEM - DATABASE FUNCTIONS
-- Phase 3: Background Processing Logic
-- =====================================================

-- 1. FUNCTION TO GET DUE CAMPAIGNS
-- Finds campaigns that are 'scheduled' and past their send time
CREATE OR REPLACE FUNCTION get_due_campaigns()
RETURNS TABLE (
  id UUID,
  name TEXT,
  template_id UUID,
  target_segments TEXT[],
  channel TEXT,
  scheduled_for TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.template_id,
    c.target_segments,
    c.channel,
    c.scheduled_for
  FROM campaigns c
  WHERE c.status = 'scheduled'
  AND c.scheduled_for <= NOW()
  ORDER BY c.scheduled_for ASC
  LIMIT 5; -- Process 5 at a time to prevent timeouts
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNCTION TO MARK CAMPAIGN AS SENDING
-- Prevents double-processing by locking the row
CREATE OR REPLACE FUNCTION mark_campaign_sending(campaign_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  updated_rows INTEGER;
BEGIN
  UPDATE campaigns
  SET 
    status = 'sending',
    sent_at = NOW(),
    updated_at = NOW()
  WHERE id = campaign_id_param
  AND status = 'scheduled';
  
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCTION TO MARK CAMPAIGN AS COMPLETED
CREATE OR REPLACE FUNCTION mark_campaign_completed(campaign_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION TO MARK CAMPAIGN AS FAILED
CREATE OR REPLACE FUNCTION mark_campaign_failed(campaign_id_param UUID, error_msg TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE campaigns
  SET 
    status = 'failed',
    updated_at = NOW()
    -- We could add an error_log column to campaigns table if needed
  WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION TO LOG CAMPAIGN SEND
-- Efficiently inserts a send record
CREATE OR REPLACE FUNCTION log_campaign_send(
  p_campaign_id UUID,
  p_customer_id UUID,
  p_channel TEXT,
  p_status TEXT,
  p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO campaign_sends (
    campaign_id,
    customer_id,
    channel,
    status,
    sent_at,
    error_message
  ) VALUES (
    p_campaign_id,
    p_customer_id,
    p_channel,
    p_status,
    CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END,
    p_error
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- NOTES
-- =====================================================

-- These functions are SECURITY DEFINER to allow the Edge Function
-- (which might run as a service role or specific user) to execute
-- them without complex permission issues, while controlling exactly
-- what operations are allowed.
