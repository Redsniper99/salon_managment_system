-- =====================================================
-- SCHEDULING CUSTOMIZATION SCHEMA
-- Configurable time slots and break management
-- =====================================================

-- Salon-wide scheduling settings
CREATE TABLE IF NOT EXISTS salon_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_interval INTEGER DEFAULT 30 CHECK (slot_interval IN (15, 30, 60)),
  booking_window_days INTEGER DEFAULT 30 CHECK (booking_window_days > 0),
  booking_buffer_minutes INTEGER DEFAULT 10 CHECK (booking_buffer_minutes >= 0),
  default_start_time TIME DEFAULT '09:00',
  default_end_time TIME DEFAULT '18:00',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO salon_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Stylist breaks (lunch, short breaks, etc.)
CREATE TABLE IF NOT EXISTS stylist_breaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES staff(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6 OR day_of_week IS NULL),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_type TEXT DEFAULT 'Lunch' CHECK (break_type IN ('Lunch', 'Short', 'Personal', 'Other')),
  is_recurring BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_breaks_stylist_day 
ON stylist_breaks(stylist_id, day_of_week) 
WHERE is_recurring = true;

CREATE INDEX IF NOT EXISTS idx_breaks_stylist 
ON stylist_breaks(stylist_id);

-- Enable RLS
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_breaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salon_settings
CREATE POLICY "everyone_view_settings" 
ON salon_settings FOR SELECT USING (true);

CREATE POLICY "owner_manage_settings" 
ON salon_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Owner'
  )
);

-- RLS Policies for stylist_breaks
CREATE POLICY "everyone_view_breaks" 
ON stylist_breaks FOR SELECT USING (true);

CREATE POLICY "stylists_manage_own_breaks" 
ON stylist_breaks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = stylist_breaks.stylist_id
    AND staff.profile_id = auth.uid()
  )
);

CREATE POLICY "owner_manage_all_breaks" 
ON stylist_breaks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Owner', 'Manager')
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_scheduling_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_salon_settings_updated_at
BEFORE UPDATE ON salon_settings
FOR EACH ROW
EXECUTE FUNCTION update_scheduling_updated_at();

CREATE TRIGGER trigger_stylist_breaks_updated_at
BEFORE UPDATE ON stylist_breaks
FOR EACH ROW
EXECUTE FUNCTION update_scheduling_updated_at();

-- Comments
COMMENT ON TABLE salon_settings IS 'Salon-wide scheduling configuration';
COMMENT ON COLUMN salon_settings.slot_interval IS 'Time slot interval in minutes (15, 30, or 60)';
COMMENT ON COLUMN salon_settings.booking_window_days IS 'How many days ahead customers can book';
COMMENT ON COLUMN salon_settings.booking_buffer_minutes IS 'Buffer time between appointments for cleanup/setup';

COMMENT ON TABLE stylist_breaks IS 'Stylist break times (lunch, short breaks, etc.)';
COMMENT ON COLUMN stylist_breaks.day_of_week IS '0=Sunday, 6=Saturday, NULL=all days';
COMMENT ON COLUMN stylist_breaks.is_recurring IS 'Whether break repeats weekly';
