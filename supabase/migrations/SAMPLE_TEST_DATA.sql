-- ============================================
-- SAMPLE DATA FOR STYLIST AVAILABILITY TESTING
-- Run this in your Supabase SQL Editor
-- ============================================

-- First, insert some sample services (if not already present)
INSERT INTO public.services (id, name, category, price, duration, gender, is_active, description)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Men''s Haircut', 'Hair', 800, 30, 'Male', true, 'Classic men''s haircut'),
    ('22222222-2222-2222-2222-222222222222', 'Women''s Haircut', 'Hair', 1200, 45, 'Female', true, 'Women''s haircut and styling'),
    ('33333333-3333-3333-3333-333333333333', 'Hair Coloring', 'Hair', 3500, 90, 'Unisex', true, 'Full hair coloring service'),
    ('44444444-4444-4444-4444-444444444444', 'Beard Trim', 'Beard', 400, 20, 'Male', true, 'Beard shaping and trim'),
    ('55555555-5555-5555-5555-555555555555', 'Classic Facial', 'Facial', 1500, 45, 'Unisex', true, 'Deep cleansing facial'),
    ('66666666-6666-6666-6666-666666666666', 'Bridal Makeup', 'Bridal', 15000, 120, 'Female', true, 'Complete bridal makeup'),
    ('77777777-7777-7777-7777-777777777777', 'Kids Haircut', 'Kids', 500, 20, 'Unisex', true, 'Haircut for children under 12'),
    ('88888888-8888-8888-8888-888888888888', 'Pedicure', 'Spa', 1200, 45, 'Unisex', true, 'Classic pedicure treatment'),
    ('99999999-9999-9999-9999-999999999999', 'Manicure', 'Spa', 800, 30, 'Unisex', true, 'Classic manicure treatment')
ON CONFLICT (id) DO NOTHING;

-- Insert sample stylists with different specializations
-- Make sure to replace the branch_id with your actual branch ID
-- You can find your branch ID with: SELECT id FROM branches LIMIT 1;

-- Get the first branch ID (run this separately to get the ID)
-- SELECT id FROM branches LIMIT 1;

-- Insert sample staff members with specializations (skills)
INSERT INTO public.staff (id, name, email, phone, role, branch_id, specializations, working_days, working_hours, is_active, is_emergency_unavailable)
VALUES
    -- Sarah: Hair specialist (Men's, Women's, Hair Coloring)
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'Sarah Johnson',
        'sarah@salon.com',
        '+94771234567',
        'Stylist',
        (SELECT id FROM branches LIMIT 1),
        ARRAY['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333']::uuid[],
        ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        '{"start": "09:00", "end": "18:00"}'::jsonb,
        true,
        false
    ),
    
    -- Mike: Beard & Men's Hair specialist
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'Mike Chen',
        'mike@salon.com',
        '+94772345678',
        'Stylist',
        (SELECT id FROM branches LIMIT 1),
        ARRAY['11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777']::uuid[],
        ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        '{"start": "10:00", "end": "19:00"}'::jsonb,
        true,
        false
    ),
    
    -- Priya: Bridal & Facial specialist
    (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Priya Fernando',
        'priya@salon.com',
        '+94773456789',
        'Stylist',
        (SELECT id FROM branches LIMIT 1),
        ARRAY['55555555-5555-5555-5555-555555555555', '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222']::uuid[],
        ARRAY['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        '{"start": "09:00", "end": "17:00"}'::jsonb,
        true,
        false
    ),
    
    -- Ravi: Full service stylist (All categories)
    (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'Ravi Perera',
        'ravi@salon.com',
        '+94774567890',
        'Stylist',
        (SELECT id FROM branches LIMIT 1),
        ARRAY[
            '11111111-1111-1111-1111-111111111111',
            '22222222-2222-2222-2222-222222222222',
            '44444444-4444-4444-4444-444444444444',
            '55555555-5555-5555-5555-555555555555',
            '77777777-7777-7777-7777-777777777777'
        ]::uuid[],
        ARRAY['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
        '{"start": "08:00", "end": "16:00"}'::jsonb,
        true,
        false
    ),
    
    -- Nisha: Spa specialist (Pedicure, Manicure, Facial)
    (
        'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        'Nisha Silva',
        'nisha@salon.com',
        '+94775678901',
        'Stylist',
        (SELECT id FROM branches LIMIT 1),
        ARRAY['88888888-8888-8888-8888-888888888888', '99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555']::uuid[],
        ARRAY['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
        '{"start": "09:30", "end": "18:30"}'::jsonb,
        true,
        false
    )
ON CONFLICT (id) DO UPDATE SET
    specializations = EXCLUDED.specializations,
    working_days = EXCLUDED.working_days,
    working_hours = EXCLUDED.working_hours;

-- Insert sample customers for testing
INSERT INTO public.customers (id, name, phone, email, gender, is_active)
VALUES
    ('f1111111-1111-1111-1111-111111111111', 'John Doe', '+94777111111', 'john@example.com', 'Male', true),
    ('f2222222-2222-2222-2222-222222222222', 'Jane Smith', '+94777222222', 'jane@example.com', 'Female', true),
    ('f3333333-3333-3333-3333-333333333333', 'Kumar Raj', '+94777333333', 'kumar@example.com', 'Male', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES 
-- Run these to verify the data was inserted correctly
-- ============================================

-- Check services
SELECT id, name, category, duration FROM services WHERE is_active = true;

-- Check stylists with their skills
SELECT 
    s.name as stylist_name,
    s.working_days,
    array_agg(sv.name) as skills
FROM staff s
LEFT JOIN services sv ON sv.id = ANY(s.specializations)
WHERE s.role = 'Stylist' AND s.is_active = true
GROUP BY s.id, s.name, s.working_days
ORDER BY s.name;

-- Test query: Find stylists who can do "Men's Haircut"
SELECT s.name, s.working_days
FROM staff s
WHERE s.role = 'Stylist' 
  AND s.is_active = true
  AND '11111111-1111-1111-1111-111111111111' = ANY(s.specializations);
