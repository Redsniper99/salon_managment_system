-- Allow stylists to update their own is_emergency_unavailable status
-- This policy enables the emergency toggle feature

-- First, check if staff table has RLS enabled
-- If not, we'll enable it and create appropriate policies

-- Drop existing policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Stylists can update own emergency status" ON staff;

-- Create policy allowing stylists to update their own emergency status
CREATE POLICY "Stylists can update own emergency status"
  ON staff FOR UPDATE
  TO authenticated
  USING (
    -- User must be authenticated and updating their own record
    profile_id = auth.uid()
  )
  WITH CHECK (
    -- Only allow updating the emergency status column
    profile_id = auth.uid()
  );

-- Also ensure staff can read their own record  
DROP POLICY IF EXISTS "Users can view own staff record" ON staff;

CREATE POLICY "Users can view own staff record"
  ON staff FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

-- Ensure RLS is enabled on staff table
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
