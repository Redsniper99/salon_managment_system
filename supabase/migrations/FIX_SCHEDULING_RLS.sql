-- Ensure staff table is readable by all authenticated users
-- This is necessary for appointment booking to check availability
DROP POLICY IF EXISTS "Authenticated users can view staff" ON staff;
CREATE POLICY "Authenticated users can view staff"
ON staff FOR SELECT
TO authenticated
USING (true);

-- Ensure stylist_breaks table is readable by all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view breaks" ON stylist_breaks;
CREATE POLICY "Authenticated users can view breaks"
ON stylist_breaks FOR SELECT
TO authenticated
USING (true);

-- Ensure salon_settings is readable (already likely true, but reinforcing)
DROP POLICY IF EXISTS "Authenticated users can view settings" ON salon_settings;
CREATE POLICY "Authenticated users can view settings"
ON salon_settings FOR SELECT
TO authenticated
USING (true);
