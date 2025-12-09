-- =====================================================
-- COMPLETE SEGMENTATION FIX - Drop and Recreate
-- =====================================================

-- 1. Drop existing functions
DROP FUNCTION IF EXISTS refresh_segment_counts();
DROP FUNCTION IF EXISTS update_customer_stats(UUID);

-- 2. Recreate with SECURITY DEFINER (allows RPC to work)
CREATE OR REPLACE FUNCTION refresh_segment_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customer_segments cs
  SET customer_count = (
    SELECT COUNT(DISTINCT c.id)
    FROM customers c
    WHERE cs.name = ANY(c.segment_tags)
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_customer_stats(customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customers
  SET 
    total_visits = (
      SELECT COUNT(*) 
      FROM appointments 
      WHERE appointments.customer_id = $1 AND status = 'Completed'
    ),
    total_spent = (
      SELECT COALESCE(SUM(total), 0)
      FROM invoices
      WHERE invoices.customer_id = $1
    ),
    last_visit_date = (
      SELECT MAX(appointment_date)
      FROM appointments
      WHERE appointments.customer_id = $1 AND status = 'Completed'
    )
  WHERE id = $1;
END;
$$;

-- 3. Grant permissions
GRANT EXECUTE ON FUNCTION refresh_segment_counts() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_customer_stats(UUID) TO authenticated, anon;

-- 4. Test it
SELECT refresh_segment_counts();

-- 5. Show results
SELECT name, customer_count, is_active FROM customer_segments ORDER BY customer_count DESC;
