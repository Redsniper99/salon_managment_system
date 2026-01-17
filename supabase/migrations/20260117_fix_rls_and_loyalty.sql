-- Fix RLS Policies and Missing Functions
-- This migration addresses:
-- 1. RLS policy for loyalty_cards table
-- 2. RLS policy for staff_earnings table  
-- 3. Missing increment_loyalty_points RPC function

-- =============================================
-- 1. LOYALTY CARDS RLS POLICY
-- =============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow staff to read loyalty cards" ON loyalty_cards;

-- Allow authenticated users (staff) to read loyalty cards
CREATE POLICY "Allow staff to read loyalty cards"
ON loyalty_cards
FOR SELECT
TO authenticated
USING (true);

-- Allow staff to insert/update loyalty cards (for selling cards)
DROP POLICY IF EXISTS "Allow staff to manage loyalty cards" ON loyalty_cards;

CREATE POLICY "Allow staff to manage loyalty cards"
ON loyalty_cards
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 2. STAFF EARNINGS RLS POLICY
-- =============================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow staff to read earnings" ON staff_earnings;

-- Allow authenticated users to read staff earnings
CREATE POLICY "Allow staff to read earnings"
ON staff_earnings
FOR SELECT
TO authenticated
USING (true);

-- Allow staff to manage earnings (create/update)
DROP POLICY IF EXISTS "Allow staff to manage earnings" ON staff_earnings;

CREATE POLICY "Allow staff to manage earnings"
ON staff_earnings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- =============================================
-- 3. INCREMENT LOYALTY POINTS FUNCTION
-- =============================================

-- Drop function if it exists
DROP FUNCTION IF EXISTS increment_loyalty_points(UUID, INTEGER);

-- Create function to increment loyalty points
CREATE OR REPLACE FUNCTION increment_loyalty_points(
    customer_uuid UUID,
    points_to_add INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update customer_loyalty table
    UPDATE customer_loyalty
    SET 
        total_points = total_points + points_to_add,
        updated_at = NOW()
    WHERE customer_id = customer_uuid;

    -- If no row was updated, insert a new record
    IF NOT FOUND THEN
        INSERT INTO customer_loyalty (
            customer_id,
            total_points,
            redeemed_points,
            total_visits,
            last_reward_visit,
            created_at,
            updated_at
        ) VALUES (
            customer_uuid,
            points_to_add,
            0,
            0,
            0,
            NOW(),
            NOW()
        );
    END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_loyalty_points(UUID, INTEGER) TO authenticated;

-- =============================================
-- 4. ADDITIONAL HELPER FUNCTIONS
-- =============================================

-- Function to get customer loyalty points
DROP FUNCTION IF EXISTS get_customer_loyalty_points(UUID);

CREATE OR REPLACE FUNCTION get_customer_loyalty_points(customer_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    points INTEGER;
BEGIN
    SELECT (total_points - redeemed_points) INTO points
    FROM customer_loyalty
    WHERE customer_id = customer_uuid;
    
    RETURN COALESCE(points, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION get_customer_loyalty_points(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION increment_loyalty_points(UUID, INTEGER) IS 'Increments loyalty points for a customer, creating record if needed';
COMMENT ON FUNCTION get_customer_loyalty_points(UUID) IS 'Returns available loyalty points for a customer';
