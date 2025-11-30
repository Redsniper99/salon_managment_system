-- Add emergency unavailable flag to staff (safe if already exists)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_emergency_unavailable BOOLEAN DEFAULT false;

-- Create stylist availability table (safe if already exists)
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

-- Index for faster queries during booking (safe if already exists)
CREATE INDEX IF NOT EXISTS idx_stylist_availability_stylist_date 
ON stylist_availability(stylist_id, start_time);

-- Enable RLS
ALTER TABLE stylist_availability ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Everyone can view availability" ON stylist_availability;
DROP POLICY IF EXISTS "Manage own availability" ON stylist_availability;

-- Recreate policies
CREATE POLICY "Everyone can view availability"
  ON stylist_availability FOR SELECT
  TO authenticated
  USING (true);

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
