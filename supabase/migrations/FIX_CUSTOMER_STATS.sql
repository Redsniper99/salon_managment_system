-- ============================================
-- FIX CUSTOMER STATS FUNCTION - CASE SENSITIVITY
-- ============================================
-- This fixes the issue where appointments aren't counted
-- because of case-sensitive status matching
-- ============================================

-- First, let's see what status values actually exist
SELECT DISTINCT status, COUNT(*) as count
FROM appointments
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- FIX THE update_customer_stats FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS update_customer_stats(uuid);

CREATE OR REPLACE FUNCTION update_customer_stats(p_customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers c
  SET 
    total_visits = (
      SELECT COUNT(*) 
      FROM appointments a
      WHERE a.customer_id = p_customer_id
        AND a.status = 'Completed'
    ),
    total_spent = (
      SELECT COALESCE(SUM(i.total), 0)
      FROM invoices i
      WHERE i.customer_id = p_customer_id
    ),
    last_visit_date = (
      SELECT MAX(a.appointment_date)
      FROM appointments a
      WHERE a.customer_id = p_customer_id
        AND a.status = 'Completed'
    )
  WHERE c.id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NOW UPDATE ALL CUSTOMER STATS
-- ============================================

DO $$
DECLARE
    customer_record RECORD;
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Updating customer stats for all customers...';
    
    FOR customer_record IN SELECT id, name FROM customers LOOP
        PERFORM update_customer_stats(customer_record.id);
        updated_count := updated_count + 1;
        
        IF updated_count % 10 = 0 THEN
            RAISE NOTICE 'Updated % customers...', updated_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Updated stats for % customers total', updated_count;
END $$;

-- ============================================
-- CATEGORIZE ALL CUSTOMERS
-- ============================================

DO $$
DECLARE
    customer_record RECORD;
    categorized_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Categorizing all customers...';
    
    FOR customer_record IN SELECT id, name FROM customers LOOP
        PERFORM auto_categorize_customer(customer_record.id);
        categorized_count := categorized_count + 1;
        
        IF categorized_count % 10 = 0 THEN
            RAISE NOTICE 'Categorized % customers...', categorized_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Categorized % customers total', categorized_count;
END $$;

-- Refresh segment counts
SELECT refresh_segment_counts();

-- ============================================
-- VERIFY RESULTS
-- ============================================

-- Check individual customer
SELECT 
    name,
    total_visits,
    total_spent,
    last_visit_date,
    segment_tags,
    (SELECT COUNT(*) FROM appointments WHERE customer_id = customers.id AND status = 'Completed') as completed_count
FROM customers
ORDER BY total_spent DESC
LIMIT 10;

-- Check segment distribution
SELECT 
    name,
    customer_count,
    description
FROM customer_segments
WHERE is_active = true
ORDER BY customer_count DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Customer stats and segments updated!';
    RAISE NOTICE '📊 Check the results above';
    RAISE NOTICE '';
END $$;
