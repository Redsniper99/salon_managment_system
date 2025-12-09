-- Add emergency unavailable flag to staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_emergency_unavailable BOOLEAN DEFAULT false;

-- Create stylist availability table for scheduled leaves/breaks
CREATE TABLE IF NOT EXISTS stylist_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES staff(id) NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('holiday', 'half_day', 'emergency', 'break', 'other')),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure end_time is after start_time
  CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Index for faster queries during booking
CREATE INDEX IF NOT EXISTS idx_stylist_availability_stylist_date 
ON stylist_availability(stylist_id, start_time);

-- RLS Policies
ALTER TABLE stylist_availability ENABLE ROW LEVEL SECURITY;

-- Everyone can view availability (needed for booking)
CREATE POLICY "Everyone can view availability"
  ON stylist_availability FOR SELECT
  TO authenticated
  USING (true);

-- Only Owner/Manager and the Stylist themselves can manage it
CREATE POLICY "Manage own availability"
  ON stylist_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role IN ('Owner', 'Manager')
        OR 
        profiles.id = (SELECT profile_id FROM staff WHERE id = stylist_availability.stylist_id)
      )
    )
  );
