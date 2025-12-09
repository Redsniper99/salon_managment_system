-- ============================================
-- CHECK SEGMENTS DATA
-- ============================================

-- 1. Check if segments exist
SELECT count(*) as segment_count FROM customer_segments;

-- 2. List all segments with their counts
SELECT name, customer_count, is_active FROM customer_segments;

-- 3. Check if refresh_segment_counts works
SELECT refresh_segment_counts();

-- 4. Check counts again after refresh
SELECT name, customer_count FROM customer_segments;

-- 5. Check if any customers have segment tags
SELECT count(*) as customers_with_segments 
FROM customers 
WHERE array_length(segment_tags, 1) > 0;

-- 6. Show sample customer tags
SELECT name, segment_tags 
FROM customers 
WHERE array_length(segment_tags, 1) > 0
LIMIT 5;
