-- =====================================================
-- FIX SEGMENTATION - Safe to run multiple times
-- =====================================================

-- Only create functions (these can be replaced safely)
CREATE OR REPLACE FUNCTION refresh_segment_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE customer_segments cs
  SET customer_count = (
    SELECT COUNT(DISTINCT c.id)
    FROM customers c
    WHERE cs.name = ANY(c.segment_tags)
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_stats(customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET 
    total_visits = (
      SELECT COUNT(*) 
      FROM appointments 
      WHERE customer_id = $1 AND status = 'Completed'
    ),
    total_spent = (
      SELECT COALESCE(SUM(total), 0)
      FROM invoices
      WHERE customer_id = $1
    ),
    last_visit_date = (
      SELECT MAX(appointment_date)
      FROM appointments
      WHERE customer_id = $1 AND status = 'Completed'
    )
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT refresh_segment_counts();

-- Show results
SELECT name, customer_count FROM customer_segments ORDER BY customer_count DESC;
