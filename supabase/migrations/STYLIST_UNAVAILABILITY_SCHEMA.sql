-- =====================================================
-- STYLIST UNAVAILABILITY SCHEMA
-- Self-managed availability for stylists
-- =====================================================

-- Create unavailability tracking table
CREATE TABLE IF NOT EXISTS stylist_unavailability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  unavailable_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_stylist_date UNIQUE(stylist_id, unavailable_date)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unavailability_stylist_date 
ON stylist_unavailability(stylist_id, unavailable_date);

-- Create index for date-based queries
CREATE INDEX IF NOT EXISTS idx_unavailability_date 
ON stylist_unavailability(unavailable_date);

-- Enable RLS
ALTER TABLE stylist_unavailability ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Stylists can manage their own unavailability
CREATE POLICY "stylists_manage_own_unavailability" 
ON stylist_unavailability
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = stylist_unavailability.stylist_id
    AND staff.profile_id = auth.uid()
  )
);

-- RLS Policy: Everyone can view unavailability (needed for booking)
CREATE POLICY "everyone_view_unavailability"
ON stylist_unavailability
FOR SELECT
USING (true);

-- Function to clean up old unavailability records (30+ days old)
CREATE OR REPLACE FUNCTION cleanup_old_unavailability()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM stylist_unavailability
  WHERE unavailable_date < CURRENT_DATE - INTERVAL '30 days';
  
  RAISE NOTICE 'Cleaned up old unavailability records';
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_unavailability_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_unavailability_timestamp
BEFORE UPDATE ON stylist_unavailability
FOR EACH ROW
EXECUTE FUNCTION update_unavailability_updated_at();

-- Comments
COMMENT ON TABLE stylist_unavailability IS 'Tracks dates when stylists are unavailable for appointments';
COMMENT ON COLUMN stylist_unavailability.stylist_id IS 'Reference to staff member';
COMMENT ON COLUMN stylist_unavailability.unavailable_date IS 'Date the stylist is unavailable';
COMMENT ON COLUMN stylist_unavailability.reason IS 'Optional reason (vacation, sick, personal, etc)';
COMMENT ON FUNCTION cleanup_old_unavailability() IS 'Removes unavailability records older than 30 days';
