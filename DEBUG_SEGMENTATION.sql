-- ============================================
-- DEBUG CUSTOMER SEGMENTATION
-- ============================================
-- Run this to see why customers aren't being categorized
-- ============================================

-- 1. Check if customers exist
SELECT COUNT(*) as total_customers FROM customers;

-- 2. Check customer stats (should have values)
SELECT 
    id,
    name,
    total_visits,
    total_spent,
    last_visit_date,
    segment_tags
FROM customers
LIMIT 10;

-- 3. Check appointments and their status values
SELECT 
    status,
    COUNT(*) as count
FROM appointments
GROUP BY status;

-- 4. Check if any appointments are marked as completed (case-sensitive)
SELECT COUNT(*) as completed_appointments
FROM appointments
WHERE status = 'Completed';

-- 5. Check invoices
SELECT COUNT(*) as total_invoices FROM invoices;

-- 6. Check if segments exist
SELECT name, auto_criteria FROM customer_segments WHERE is_active = true;

-- 7. Manual test: Update one customer's stats
DO $$
DECLARE
    test_customer_id UUID;
    test_name TEXT;
    test_visits INTEGER;
    test_spent DECIMAL;
    test_tags TEXT[];
BEGIN
    -- Get first customer
    SELECT id INTO test_customer_id FROM customers LIMIT 1;
    
    IF test_customer_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with customer: %', test_customer_id;
        
        -- Update their stats
        PERFORM update_customer_stats(test_customer_id);
        RAISE NOTICE 'Customer stats updated';
        
        -- Categorize them
        PERFORM auto_categorize_customer(test_customer_id);
        RAISE NOTICE 'Customer categorized';
        
        -- Get results
        SELECT name, total_visits, total_spent, segment_tags
        INTO test_name, test_visits, test_spent, test_tags
        FROM customers
        WHERE id = test_customer_id;
        
        RAISE NOTICE 'Results: % - Visits: %, Spent: %, Tags: %', test_name, test_visits, test_spent, test_tags;
    ELSE
        RAISE NOTICE 'No customers found';
    END IF;
END $$;

-- 8. Show results
SELECT 
    c.name,
    c.total_visits,
    c.total_spent,
    c.last_visit_date,
    c.segment_tags,
    (SELECT COUNT(*) FROM appointments WHERE customer_id = c.id AND status = 'Completed') as completed_apt_count,
    (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as invoice_count
FROM customers c
ORDER BY c.total_visits DESC
LIMIT 10;
