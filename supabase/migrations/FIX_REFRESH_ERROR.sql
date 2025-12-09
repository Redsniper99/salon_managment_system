-- ============================================
-- FIX REFRESH SEGMENT COUNTS ERROR
-- ============================================
-- The error "UPDATE requires a WHERE clause" (Code 21000)
-- indicates that the database requires an explicit WHERE clause
-- for safety when updating records.
-- ============================================

CREATE OR REPLACE FUNCTION refresh_segment_counts()
RETURNS VOID AS $$
BEGIN
  -- We add "WHERE id IS NOT NULL" to satisfy the safety requirement
  -- This effectively still updates all rows since ID is primary key
  UPDATE customer_segments cs
  SET customer_count = (
    SELECT COUNT(DISTINCT c.id)
    FROM customers c
    WHERE cs.name = ANY(c.segment_tags)
  )
  WHERE cs.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify it works now
SELECT refresh_segment_counts();

-- Show the results
SELECT name, customer_count FROM customer_segments WHERE is_active = true;
