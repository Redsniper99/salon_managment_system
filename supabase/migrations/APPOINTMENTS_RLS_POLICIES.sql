-- =====================================================
-- APPOINTMENTS RLS POLICIES
-- Enforce role-based access for appointments
-- =====================================================

-- Enable RLS on appointments table (if not already enabled)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "appointments_select_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_insert_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_update_policy" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_policy" ON appointments;

-- SELECT Policy: Stylists see only their appointments, others see all
CREATE POLICY "appointments_select_policy" ON appointments
FOR SELECT
USING (
  -- Allow if user is Owner or Manager
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Owner', 'Manager')
  )
  OR
  -- Allow if user is the assigned Stylist
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.profile_id = auth.uid()
    AND staff.id = appointments.stylist_id
  )
);

-- INSERT Policy: Only Owner and Manager can create appointments
CREATE POLICY "appointments_insert_policy" ON appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Owner', 'Manager', 'Receptionist')
  )
);

-- UPDATE Policy: Stylists can update their own appointments, others all
CREATE POLICY "appointments_update_policy" ON appointments
FOR UPDATE
USING (
  -- Allow if user is Owner or Manager
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Owner', 'Manager', 'Receptionist')
  )
  OR
  -- Allow if user is the assigned Stylist
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.profile_id = auth.uid()
    AND staff.id = appointments.stylist_id
  )
);

-- DELETE Policy: Only Owner and Manager can delete appointments
CREATE POLICY "appointments_delete_policy" ON appointments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('Owner', 'Manager')
  )
);
