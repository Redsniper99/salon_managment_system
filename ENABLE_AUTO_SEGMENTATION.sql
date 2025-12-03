-- =====================================================
-- AUTO-UPDATE CUSTOMER SEGMENTATION TRIGGERS
-- =====================================================
-- 
-- This script creates triggers to automatically update customer
-- statistics and segmentation when appointments are completed
-- or payments are made.
-- 
-- Run this in Supabase SQL Editor to enable automatic segmentation!
-- =====================================================

-- =====================================================
-- 1. CREATE FUNCTION TO AUTO-CATEGORIZE CUSTOMER
-- =====================================================

CREATE OR REPLACE FUNCTION auto_categorize_customer(customer_id UUID)
RETURNS VOID AS $$
DECLARE
    customer_data RECORD;
    segment_record RECORD;
    applied_segments TEXT[] := '{}';
    total_appointments INTEGER;
    service_ids UUID[];
    service_names TEXT[];
    matching_count INTEGER;
    days_since_visit INTEGER;
BEGIN
    -- Get customer data with stats
    SELECT * INTO customer_data 
    FROM customers 
    WHERE id = customer_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Loop through all active segments
    FOR segment_record IN 
        SELECT name, auto_criteria 
        FROM customer_segments 
        WHERE is_active = true
    LOOP
        DECLARE
            criteria JSONB := segment_record.auto_criteria;
            matches BOOLEAN := true;
        BEGIN
            -- Check min_visits
            IF criteria->>'min_visits' IS NOT NULL THEN
                IF customer_data.total_visits < (criteria->>'min_visits')::INTEGER THEN
                    matches := false;
                END IF;
            END IF;

            -- Check max_visits
            IF criteria->>'max_visits' IS NOT NULL THEN
                IF customer_data.total_visits > (criteria->>'max_visits')::INTEGER THEN
                    matches := false;
                END IF;
            END IF;

            -- Check min_total_spent
            IF criteria->>'min_total_spent' IS NOT NULL THEN
                IF customer_data.total_spent < (criteria->>'min_total_spent')::DECIMAL THEN
                    matches := false;
                END IF;
            END IF;

            -- Check service keywords and min_bookings
            IF criteria->'service_keywords' IS NOT NULL AND criteria->>'min_bookings' IS NOT NULL THEN
                -- Get appointment count with matching service keywords
                SELECT COUNT(DISTINCT a.id) INTO matching_count
                FROM appointments a
                JOIN LATERAL unnest(a.services) AS service_id ON true
                JOIN services s ON s.id = service_id::uuid
                WHERE a.customer_id = customer_id
                  AND a.status = 'Completed'
                  AND EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements_text(criteria->'service_keywords') AS keyword
                      WHERE LOWER(s.name) LIKE '%' || LOWER(keyword::text) || '%'
                  );

                IF matching_count < (criteria->>'min_bookings')::INTEGER THEN
                    matches := false;
                END IF;
            END IF;

            -- Check days_since_last_visit
            IF criteria->>'days_since_last_visit' IS NOT NULL AND customer_data.last_visit_date IS NOT NULL THEN
                days_since_visit := EXTRACT(DAY FROM (CURRENT_DATE - customer_data.last_visit_date));
                IF days_since_visit < (criteria->>'days_since_last_visit')::INTEGER THEN
                    matches := false;
                END IF;
            END IF;

            -- Add segment if all criteria match
            IF matches THEN
                applied_segments := array_append(applied_segments, segment_record.name);
            END IF;
        END;
    END LOOP;

    -- Update customer's segment tags
    UPDATE customers
    SET segment_tags = applied_segments
    WHERE id = customer_id;

    RAISE NOTICE 'Customer % categorized into segments: %', customer_id, applied_segments;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. CREATE TRIGGER FUNCTION FOR APPOINTMENT COMPLETION
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_customer_on_appointment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update when appointment is marked as completed
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Update customer stats
        PERFORM update_customer_stats(NEW.customer_id);
        
        -- Auto-categorize customer
        PERFORM auto_categorize_customer(NEW.customer_id);
        
        -- Refresh segment counts
        PERFORM refresh_segment_counts();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CREATE TRIGGER FUNCTION FOR INVOICE CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_update_customer_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer stats when invoice is created
    PERFORM update_customer_stats(NEW.customer_id);
    
    -- Auto-categorize customer
    PERFORM auto_categorize_customer(NEW.customer_id);
    
    -- Refresh segment counts
    PERFORM refresh_segment_counts();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CREATE TRIGGERS ON TABLES
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_appointment_completion_updates_customer ON appointments;
DROP TRIGGER IF EXISTS trigger_invoice_creation_updates_customer ON invoices;

-- Trigger on appointment completion
CREATE TRIGGER trigger_appointment_completion_updates_customer
    AFTER UPDATE OF status ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_customer_on_appointment();

-- Trigger on invoice creation
CREATE TRIGGER trigger_invoice_creation_updates_customer
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_customer_on_invoice();

-- =====================================================
-- 5. INITIAL CATEGORIZATION (RUN ONCE)
-- =====================================================

-- This will categorize all existing customers based on their history
-- This may take a while if you have many customers
DO $$
DECLARE
    customer_record RECORD;
    customer_count INTEGER := 0;
BEGIN
    -- First update all customer stats
    FOR customer_record IN SELECT id FROM customers LOOP
        PERFORM update_customer_stats(customer_record.id);
        customer_count := customer_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Updated stats for % customers', customer_count;
    
    -- Then categorize all customers
    customer_count := 0;
    FOR customer_record IN SELECT id FROM customers LOOP
        PERFORM auto_categorize_customer(customer_record.id);
        customer_count := customer_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Categorized % customers', customer_count;
    
    -- Finally refresh segment counts
    PERFORM refresh_segment_counts();
    
    RAISE NOTICE '✅ Segment counts refreshed';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check segment distribution
SELECT 
    cs.name as segment_name,
    cs.customer_count,
    cs.description
FROM customer_segments cs
WHERE cs.is_active = true
ORDER BY cs.customer_count DESC;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ==============================================';
    RAISE NOTICE '✅ Customer Segmentation Auto-Update ENABLED!';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 What happens now:';
    RAISE NOTICE '  1. ✅ When appointment is completed → Customer stats & segments update';
    RAISE NOTICE '  2. ✅ When invoice is created → Customer stats & segments update';
    RAISE NOTICE '  3. ✅ All existing customers have been categorized';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Check the segment distribution above';
    RAISE NOTICE '';
END $$;
