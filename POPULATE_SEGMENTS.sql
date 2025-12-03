-- ============================================
-- FIX auto_categorize_customer FUNCTION
-- ============================================
-- Fixes the ambiguous customer_id parameter issue
-- ============================================

DROP FUNCTION IF EXISTS auto_categorize_customer(uuid);

CREATE OR REPLACE FUNCTION auto_categorize_customer(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
    customer_data RECORD;
    segment_record RECORD;
    applied_segments TEXT[] := '{}';
    matching_count INTEGER;
    days_since_visit INTEGER;
BEGIN
    -- Get customer data
    SELECT * INTO customer_data 
    FROM customers 
    WHERE id = p_customer_id;

    IF NOT FOUND THEN RETURN; END IF;

    -- Loop through active segments
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

            -- Check service keywords (FIXED - using p_customer_id)
            IF criteria->'service_keywords' IS NOT NULL AND criteria->>'min_bookings' IS NOT NULL THEN
                SELECT COUNT(DISTINCT a.id) INTO matching_count
                FROM appointments a
                JOIN LATERAL unnest(a.services) AS service_id ON true
                JOIN services s ON s.id = service_id::uuid
                WHERE a.customer_id = p_customer_id  -- FIXED: was just customer_id
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
                -- DATE - DATE returns integer (number of days)
                days_since_visit := CURRENT_DATE - customer_data.last_visit_date;
                IF days_since_visit < (criteria->>'days_since_last_visit')::INTEGER THEN
                    matches := false;
                END IF;
            END IF;

            -- Add segment if matches
            IF matches THEN
                applied_segments := array_append(applied_segments, segment_record.name);
            END IF;
        END;
    END LOOP;

    -- Update customer tags
    UPDATE customers
    SET segment_tags = applied_segments
    WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now run the POPULATE_SEGMENTS script steps
-- 1. Delete existing segments
DELETE FROM customer_segments;

-- 2. Insert all default segments
INSERT INTO customer_segments (name, description, color, icon, auto_criteria, is_active) VALUES
  ('VIP Customers', 'High-value customers with frequent visits', '#f59e0b', 'crown',
   '{"min_total_spent": 5000, "min_visits": 10}'::jsonb, true),
  
  ('New Customers', 'Customers with 1-2 visits only', '#10b981', 'user-plus',
   '{"max_visits": 2}'::jsonb, true),
  
  ('Haircut Regulars', 'Customers who frequently book haircuts', '#3b82f6', 'scissors', 
   '{"service_keywords": ["haircut", "trim"], "min_bookings": 3}'::jsonb, true),
  
  ('Beauty Treatments', 'Customers who book facials, spa treatments', '#ec4899', 'sparkles',
   '{"service_keywords": ["facial", "treatment", "spa", "massage"], "min_bookings": 2}'::jsonb, true),
  
  ('Hair Color Specialists', 'Customers who get hair coloring services', '#8b5cf6', 'palette',
   '{"service_keywords": ["color", "dye", "highlights", "balayage"], "min_bookings": 2}'::jsonb, true),
  
  ('Inactive Customers', 'No visits in last 90 days', '#6b7280', 'user-x',
   '{"days_since_last_visit": 90}'::jsonb, true);

-- 3. Verify insertion
SELECT COUNT(*) as segments_created FROM customer_segments WHERE is_active = true;

-- 4. Re-categorize all customers (now with fixed function)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM customers LOOP
        PERFORM update_customer_stats(r.id);
        PERFORM auto_categorize_customer(r.id);
    END LOOP;
    PERFORM refresh_segment_counts();
END $$;

-- 5. Show final results
SELECT 
    name,
    customer_count,
    is_active,
    description
FROM customer_segments
ORDER BY customer_count DESC;
