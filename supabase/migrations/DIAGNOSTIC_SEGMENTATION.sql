-- ============================================
-- COMPREHENSIVE SEGMENTATION DIAGNOSTICS
-- ============================================
-- This script checks EVERYTHING to find why
-- segments aren't showing in the UI
-- ============================================

-- 1. CHECK IF SEGMENTS TABLE EXISTS AND HAS DATA
SELECT 'Checking customer_segments table...' as step;
SELECT COUNT(*) as total_segments FROM customer_segments;
SELECT * FROM customer_segments ORDER BY name;

-- 2. CHECK IF CUSTOMERS TABLE HAS SEGMENT TAGS
SELECT 'Checking customers with segment_tags...' as step;
SELECT 
    COUNT(*) as total_customers,
    COUNT(*) FILTER (WHERE segment_tags IS NOT NULL AND array_length(segment_tags, 1) > 0) as customers_with_tags
FROM customers;

SELECT 
    name,
    total_visits,
    total_spent,
    last_visit_date,
    segment_tags
FROM customers 
LIMIT 10;

-- 3. CHECK RLS POLICIES ON customer_segments
SELECT 'Checking RLS policies on customer_segments...' as step;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'customer_segments';

-- 4. CHECK IF RLS IS ENABLED
SELECT 'Checking if RLS is enabled...' as step;
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'customer_segments';

-- 5. TEST DIRECT SELECT (What the frontend tries to do)
SELECT 'Testing direct SELECT (frontend query)...' as step;
SELECT *
FROM customer_segments
WHERE is_active = true
ORDER BY customer_count DESC;

-- 6. CHECK FUNCTIONS EXIST
SELECT 'Checking if functions exist...' as step;
SELECT 
    proname as function_name,
    prosecdef as is_security_definer
FROM pg_proc 
WHERE proname IN ('update_customer_stats', 'auto_categorize_customer', 'refresh_segment_counts');

-- 7. TEST refresh_segment_counts FUNCTION
SELECT 'Testing refresh_segment_counts function...' as step;
SELECT refresh_segment_counts();

-- 8. SHOW SEGMENT DISTRIBUTION AFTER REFRESH
SELECT 'Final segment distribution...' as step;
SELECT 
    name,
    customer_count,
    description,
    color,
    icon
FROM customer_segments
WHERE is_active = true
ORDER BY customer_count DESC;

-- 9. CHECK IF ANY ERRORS IN TRIGGERS
SELECT 'Checking triggers...' as step;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('appointments', 'invoices', 'customers');

-- 10. SUMMARY
DO $$
DECLARE
    seg_count INTEGER;
    cust_count INTEGER;
    tagged_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO seg_count FROM customer_segments WHERE is_active = true;
    SELECT COUNT(*) INTO cust_count FROM customers;
    SELECT COUNT(*) INTO tagged_count FROM customers WHERE array_length(segment_tags, 1) > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 SEGMENTATION DIAGNOSTIC SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Active Segments: %', seg_count;
    RAISE NOTICE 'Total Customers: %', cust_count;
    RAISE NOTICE 'Customers with Tags: %', tagged_count;
    RAISE NOTICE '';
    
    IF seg_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: No active segments found!';
        RAISE NOTICE '   Solution: Run CUSTOMER_SEGMENTATION_SCHEMA.sql';
    END IF;
    
    IF tagged_count = 0 THEN
        RAISE NOTICE '❌ PROBLEM: No customers have been categorized!';
        RAISE NOTICE '   Solution: Run FULL_SEGMENTATION_FIX.sql';
    END IF;
    
    IF seg_count > 0 AND tagged_count > 0 THEN
        RAISE NOTICE '✅ Data looks good! Check RLS policies if UI still empty.';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;
