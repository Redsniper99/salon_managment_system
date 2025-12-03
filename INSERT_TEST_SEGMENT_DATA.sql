-- ============================================
-- INSERT TEST DATA FOR SEGMENTATION
-- ============================================
-- This script adds dummy customers and data to test
-- if they get categorized correctly.
-- ============================================

-- 1. Insert Test Customers
INSERT INTO customers (id, name, phone, email, gender, total_visits, total_spent, created_at) VALUES
  -- VIP Customer (High spend, many visits)
  ('11111111-1111-1111-1111-111111111111', 'Test VIP User', '+94771111111', 'vip@test.com', 'Female', 15, 25000, NOW() - INTERVAL '6 months'),
  
  -- New Customer (Low visits)
  ('22222222-2222-2222-2222-222222222222', 'Test New User', '+94772222222', 'new@test.com', 'Male', 1, 1500, NOW() - INTERVAL '1 week'),
  
  -- Inactive Customer (No recent visits)
  ('33333333-3333-3333-3333-333333333333', 'Test Inactive User', '+94773333333', 'inactive@test.com', 'Female', 5, 8000, NOW() - INTERVAL '4 months'),
  
  -- Haircut Regular (Multiple haircut bookings)
  ('44444444-4444-4444-4444-444444444444', 'Test Haircut Regular', '+94774444444', 'haircut@test.com', 'Male', 4, 6000, NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Dummy Appointments (to trigger logic)
-- We need services first
DO $$
DECLARE
    haircut_service_id UUID;
    facial_service_id UUID;
    stylist_id UUID;
    branch_id UUID;
BEGIN
    -- Get IDs
    SELECT id INTO haircut_service_id FROM services WHERE name ILIKE '%haircut%' LIMIT 1;
    SELECT id INTO facial_service_id FROM services WHERE name ILIKE '%facial%' LIMIT 1;
    SELECT id INTO stylist_id FROM staff LIMIT 1;
    SELECT id INTO branch_id FROM branches LIMIT 1;
    
    -- If no services found, use any service
    IF haircut_service_id IS NULL THEN SELECT id INTO haircut_service_id FROM services LIMIT 1; END IF;
    
    -- Insert appointments for Haircut Regular
    IF stylist_id IS NOT NULL AND branch_id IS NOT NULL THEN
        INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status) VALUES
        ('44444444-4444-4444-4444-444444444444', stylist_id, branch_id, ARRAY[haircut_service_id], CURRENT_DATE - 10, '10:00', 60, 'Completed'),
        ('44444444-4444-4444-4444-444444444444', stylist_id, branch_id, ARRAY[haircut_service_id], CURRENT_DATE - 20, '10:00', 60, 'Completed'),
        ('44444444-4444-4444-4444-444444444444', stylist_id, branch_id, ARRAY[haircut_service_id], CURRENT_DATE - 30, '10:00', 60, 'Completed');
        
        -- Insert old appointment for Inactive User
        INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status) VALUES
        ('33333333-3333-3333-3333-333333333333', stylist_id, branch_id, ARRAY[haircut_service_id], CURRENT_DATE - 100, '10:00', 60, 'Completed');
    END IF;
END $$;

-- 3. Run Categorization
SELECT refresh_segment_counts();

-- 4. Show Results
SELECT name, total_visits, total_spent, segment_tags 
FROM customers 
WHERE id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444'
);
