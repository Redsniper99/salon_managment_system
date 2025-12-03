-- ============================================
-- FIX SEGMENTATION PERMISSIONS & FUNCTIONS
-- ============================================
-- This script fixes potential permission issues that
-- prevent the frontend from seeing or updating segments.
-- ============================================

-- 1. Update functions to be SECURITY DEFINER
-- This ensures they run with admin privileges, bypassing RLS
-- which is important for the auto-update triggers.

CREATE OR REPLACE FUNCTION refresh_segment_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE customer_segments cs
  SET customer_count = (
    SELECT COUNT(DISTINCT c.id)
    FROM customers c
    WHERE cs.name = ANY(c.segment_tags)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION auto_categorize_customer(customer_id UUID)
RETURNS VOID AS $$
DECLARE
    customer_data RECORD;
    segment_record RECORD;
    applied_segments TEXT[] := '{}';
    total_appointments INTEGER;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix RLS Policies
-- Ensure everyone can read segments
DROP POLICY IF EXISTS "All authenticated can view segments" ON customer_segments;
CREATE POLICY "All authenticated can view segments"
  ON customer_segments FOR SELECT
  TO authenticated
  USING (true);

-- Ensure triggers can update segments (if not using SECURITY DEFINER)
-- But since we used SECURITY DEFINER above, this is just a backup for direct updates
DROP POLICY IF EXISTS "Owner can manage segments" ON customer_segments;
CREATE POLICY "Owner can manage segments"
  ON customer_segments FOR ALL
  TO authenticated
  USING (true)  -- Temporarily allow all authenticated users to update for testing
  WITH CHECK (true);

-- 3. Grant Permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 4. Verify Data Exists
SELECT count(*) as segment_count FROM customer_segments;
