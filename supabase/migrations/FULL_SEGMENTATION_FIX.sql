-- ============================================
-- MASTER FIX FOR SEGMENTATION SYSTEM
-- ============================================
-- This script fixes ALL identified issues:
-- 1. Restores missing logic for service_keywords (lost in previous update)
-- 2. Fixes "UPDATE requires WHERE clause" error
-- 3. Sets proper permissions (SECURITY DEFINER)
-- 4. Adds REAL test data (Appointments/Invoices) so stats aren't 0
-- ============================================

-- 1. DROP EVERYTHING FIRST TO START FRESH
DROP FUNCTION IF EXISTS auto_categorize_customer(uuid);
DROP FUNCTION IF EXISTS update_customer_stats(uuid);
DROP FUNCTION IF EXISTS refresh_segment_counts();

-- 2. RECREATE update_customer_stats (SECURITY DEFINER)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECREATE refresh_segment_counts (SECURITY DEFINER + WHERE FIX)
CREATE OR REPLACE FUNCTION refresh_segment_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE customer_segments cs
  SET customer_count = (
    SELECT COUNT(DISTINCT c.id)
    FROM customers c
    WHERE cs.name = ANY(c.segment_tags)
  )
  WHERE cs.id IS NOT NULL; -- Fixes "UPDATE requires WHERE clause"
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RECREATE auto_categorize_customer (FULL LOGIC + SECURITY DEFINER)
CREATE OR REPLACE FUNCTION auto_categorize_customer(customer_id UUID)
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
    WHERE id = customer_id;

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

            -- Check service keywords (RESTORED LOGIC)
            IF criteria->'service_keywords' IS NOT NULL AND criteria->>'min_bookings' IS NOT NULL THEN
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

            -- Add segment if matches
            IF matches THEN
                applied_segments := array_append(applied_segments, segment_record.name);
            END IF;
        END;
    END LOOP;

    -- Update customer tags
    UPDATE customers
    SET segment_tags = applied_segments
    WHERE id = customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ENSURE DEFAULT SEGMENTS EXIST
INSERT INTO customer_segments (name, description, color, icon, auto_criteria) VALUES
  ('Haircut Regulars', 'Customers who frequently book haircuts', '#3b82f6', 'scissors', 
   '{"service_keywords": ["haircut", "trim"], "min_bookings": 3}'::jsonb),
  ('Beauty Treatments', 'Customers who book facials, spa treatments', '#ec4899', 'sparkles',
   '{"service_keywords": ["facial", "treatment", "spa", "massage"], "min_bookings": 2}'::jsonb),
  ('Hair Color Specialists', 'Customers who get hair coloring services', '#8b5cf6', 'palette',
   '{"service_keywords": ["color", "dye", "highlights", "balayage"], "min_bookings": 2}'::jsonb),
  ('VIP Customers', 'High-value customers with frequent visits', '#f59e0b', 'crown',
   '{"min_total_spent": 5000, "min_visits": 10}'::jsonb),
  ('New Customers', 'Customers with 1-2 visits only', '#10b981', 'user-plus',
   '{"max_visits": 2}'::jsonb),
  ('Inactive Customers', 'No visits in last 90 days', '#6b7280', 'user-x',
   '{"days_since_last_visit": 90}'::jsonb)
ON CONFLICT (name) DO UPDATE SET 
  auto_criteria = EXCLUDED.auto_criteria,
  description = EXCLUDED.description;

-- 6. INSERT PROPER TEST DATA (Customers + Appointments + Invoices)
DO $$
DECLARE
    vip_id UUID := '11111111-1111-1111-1111-111111111111';
    new_id UUID := '22222222-2222-2222-2222-222222222222';
    stylist_id UUID;
    branch_id UUID;
    service_id UUID;
    i INTEGER;
BEGIN
    -- Get dependencies
    SELECT id INTO stylist_id FROM staff LIMIT 1;
    SELECT id INTO branch_id FROM branches LIMIT 1;
    SELECT id INTO service_id FROM services LIMIT 1;

    IF stylist_id IS NOT NULL AND branch_id IS NOT NULL AND service_id IS NOT NULL THEN
        
        -- A. VIP CUSTOMER (Needs 10+ visits, 5000+ spent)
        INSERT INTO customers (id, name, phone) 
        VALUES (vip_id, 'Real VIP User', '+94771111111')
        ON CONFLICT (id) DO NOTHING;

        -- Create 12 completed appointments for VIP
        FOR i IN 1..12 LOOP
            INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status)
            VALUES (vip_id, stylist_id, branch_id, ARRAY[service_id], CURRENT_DATE - i, '10:00', 60, 'Completed');
            
            -- Create invoice for each (1000 LKR each = 12000 total)
            INSERT INTO invoices (invoice_number, customer_id, branch_id, items, subtotal, total, payment_method)
            VALUES ('INV-VIP-' || i, vip_id, branch_id, '[]'::jsonb, 1000, 1000, 'Cash')
            ON CONFLICT DO NOTHING;
        END LOOP;

        -- B. NEW CUSTOMER (1 visit)
        INSERT INTO customers (id, name, phone) 
        VALUES (new_id, 'Real New User', '+94772222222')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status)
        VALUES (new_id, stylist_id, branch_id, ARRAY[service_id], CURRENT_DATE, '14:00', 60, 'Completed');

    END IF;
END $$;

-- 6. RUN FULL REFRESH
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

-- 7. SHOW RESULTS
SELECT name, customer_count FROM customer_segments WHERE is_active = true ORDER BY customer_count DESC;
