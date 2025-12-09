-- =====================================================
-- DIAGNOSE SEGMENTATION ISSUE
-- Run this to see what's wrong
-- =====================================================

-- 1. Check if customer_segments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'customer_segments'
) AS table_exists;

-- 2. Check if function exists
SELECT EXISTS (
  SELECT FROM pg_proc 
  WHERE proname = 'refresh_segment_counts'
) AS function_exists;

-- 3. Check segments data
SELECT * FROM customer_segments LIMIT 5;

-- 4. Check customers have segment_tags column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name IN ('segment_tags', 'total_visits', 'total_spent', 'last_visit_date');

-- 5. Try to call the function directly
SELECT refresh_segment_counts();

-- If you get an error above, the issue is with the function itself
-- If no error, the issue is with RPC permissions
