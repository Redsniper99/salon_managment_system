-- ============================================
-- FORCE RE-CATEGORIZATION & VERIFY
-- ============================================
-- This script forces the system to re-calculate segments
-- for ALL customers, including the test ones we just added.
-- ============================================

DO $$
DECLARE
    customer_record RECORD;
    count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Starting re-categorization of all customers...';

    -- 1. Loop through all customers and categorize them
    FOR customer_record IN SELECT id, name FROM customers LOOP
        -- Update stats first (just in case)
        PERFORM update_customer_stats(customer_record.id);
        
        -- Then categorize
        PERFORM auto_categorize_customer(customer_record.id);
        
        count := count + 1;
    END LOOP;

    RAISE NOTICE '✅ Processed % customers', count;

    -- 2. Refresh the segment counts
    PERFORM refresh_segment_counts();
    RAISE NOTICE '✅ Segment counts refreshed';
END $$;

-- ============================================
-- VERIFICATION RESULTS
-- ============================================

-- 1. Show Segment Counts (This is what the page shows)
SELECT 
    name, 
    customer_count, 
    description 
FROM customer_segments 
WHERE is_active = true 
ORDER BY customer_count DESC;

-- 2. Show Customers with their Segments
SELECT 
    name, 
    total_visits, 
    total_spent, 
    segment_tags 
FROM customers 
WHERE array_length(segment_tags, 1) > 0
ORDER BY total_spent DESC
LIMIT 10;
