-- ============================================
-- RESET AND SEED DATABASE
-- Run this in Supabase SQL Editor
-- ============================================

-- ===============================
-- STEP 1: DELETE ALL DATA
-- (Order matters due to foreign keys)
-- ===============================

-- First, delete tables with foreign key dependencies
DELETE FROM story_images;
DELETE FROM story_schedule;
DELETE FROM posting_slots;
DELETE FROM caption_templates;
DELETE FROM social_media_settings;

DELETE FROM stylist_breaks;
DELETE FROM stylist_unavailability;
DELETE FROM stylist_availability;

DELETE FROM staff_earnings;
DELETE FROM salary_settings;
DELETE FROM commission_settings;

DELETE FROM loyalty_transactions;
DELETE FROM customer_loyalty;
DELETE FROM loyalty_cards;
DELETE FROM loyalty_settings;

DELETE FROM campaign_sends;
DELETE FROM campaigns;
DELETE FROM notification_templates;

DELETE FROM invoices;
DELETE FROM appointments;
DELETE FROM promo_codes;

DELETE FROM bot_sessions;
DELETE FROM booking_otps;
DELETE FROM password_change_otps;

DELETE FROM customers;
DELETE FROM customer_segments;

DELETE FROM staff;
DELETE FROM services;
DELETE FROM salon_settings;

-- Don't delete branches and profiles as they are linked to auth

-- ===============================
-- STEP 2: INSERT SALON SETTINGS
-- ===============================

INSERT INTO salon_settings (
    slot_interval,
    booking_window_days,
    booking_buffer_minutes,
    default_start_time,
    default_end_time
) VALUES (
    30,                    -- 30 minute slots
    30,                    -- Can book up to 30 days ahead
    10,                    -- 10 minute buffer between appointments
    '09:00:00',           -- Opens at 9 AM
    '19:00:00'            -- Closes at 7 PM
);

-- ===============================
-- STEP 3: INSERT 10 SERVICES
-- ===============================

INSERT INTO services (id, name, category, price, duration, gender, is_active, description) VALUES
-- Hair Services
('11111111-1111-1111-1111-111111111101', 'Hair Cut - Men', 'Hair', 500, 30, 'Male', true, 'Professional haircut for men with styling'),
('11111111-1111-1111-1111-111111111102', 'Hair Cut - Women', 'Hair', 800, 45, 'Female', true, 'Precision haircut for women with styling'),
('11111111-1111-1111-1111-111111111103', 'Hair Coloring', 'Hair', 2500, 90, 'Unisex', true, 'Full hair coloring with premium products'),
('11111111-1111-1111-1111-111111111104', 'Hair Straightening', 'Hair', 4000, 120, 'Unisex', true, 'Keratin hair straightening treatment'),

-- Beard Services
('11111111-1111-1111-1111-111111111105', 'Beard Trim', 'Beard', 300, 20, 'Male', true, 'Professional beard trimming and shaping'),
('11111111-1111-1111-1111-111111111106', 'Clean Shave', 'Beard', 400, 30, 'Male', true, 'Traditional clean shave with hot towel'),

-- Facial Services
('11111111-1111-1111-1111-111111111107', 'Facial - Basic', 'Facial', 1500, 45, 'Unisex', true, 'Deep cleansing facial treatment'),
('11111111-1111-1111-1111-111111111108', 'Facial - Premium', 'Facial', 3000, 60, 'Unisex', true, 'Premium anti-aging facial with massage'),

-- Spa Services
('11111111-1111-1111-1111-111111111109', 'Head Massage', 'Spa', 800, 30, 'Unisex', true, 'Relaxing head and scalp massage'),
('11111111-1111-1111-1111-111111111110', 'Full Body Massage', 'Spa', 3500, 90, 'Unisex', true, 'Full body relaxation massage');

-- ===============================
-- STEP 4: INSERT STAFF
-- (Cover all services as specializations)
-- ===============================

-- Get the branch ID (assuming one exists from profile creation)
-- If no branch exists, you need to create one first

-- First check if branch exists, if not create one
INSERT INTO branches (id, name, address, phone, is_active)
SELECT 
    '22222222-2222-2222-2222-222222222201',
    'Main Salon',
    '123 Beauty Street, Colombo',
    '0112345678',
    true
WHERE NOT EXISTS (SELECT 1 FROM branches LIMIT 1);

-- Get branch ID for staff
DO $$
DECLARE
    branch_uuid uuid;
    all_services uuid[];
BEGIN
    -- Get or create branch
    SELECT id INTO branch_uuid FROM branches LIMIT 1;
    
    -- Get all service IDs
    SELECT array_agg(id) INTO all_services FROM services;
    
    -- Insert Staff Members
    INSERT INTO staff (id, name, phone, role, branch_id, specializations, working_days, working_hours, is_active) VALUES
    -- Senior Stylists (all services)
    ('33333333-3333-3333-3333-333333333301', 'Nimal Perera', '0771234501', 'Stylist', branch_uuid, 
     all_services,
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     '{"Monday": {"start": "09:00", "end": "18:00"}, "Tuesday": {"start": "09:00", "end": "18:00"}, "Wednesday": {"start": "09:00", "end": "18:00"}, "Thursday": {"start": "09:00", "end": "18:00"}, "Friday": {"start": "09:00", "end": "18:00"}, "Saturday": {"start": "09:00", "end": "14:00"}}'::jsonb,
     true),
    
    ('33333333-3333-3333-3333-333333333302', 'Kumari Silva', '0771234502', 'Stylist', branch_uuid,
     all_services,
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     '{"Monday": {"start": "09:00", "end": "18:00"}, "Tuesday": {"start": "09:00", "end": "18:00"}, "Wednesday": {"start": "09:00", "end": "18:00"}, "Thursday": {"start": "09:00", "end": "18:00"}, "Friday": {"start": "09:00", "end": "18:00"}, "Saturday": {"start": "09:00", "end": "14:00"}}'::jsonb,
     true),
    
    ('33333333-3333-3333-3333-333333333303', 'Anjali Fernando', '0771234503', 'Stylist', branch_uuid,
     all_services,
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
     '{"Monday": {"start": "10:00", "end": "19:00"}, "Tuesday": {"start": "10:00", "end": "19:00"}, "Wednesday": {"start": "10:00", "end": "19:00"}, "Thursday": {"start": "10:00", "end": "19:00"}, "Friday": {"start": "10:00", "end": "19:00"}}'::jsonb,
     true),
    
    -- Manager
    ('33333333-3333-3333-3333-333333333304', 'Suresh Jayawardena', '0771234504', 'Manager', branch_uuid,
     all_services,
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     '{"Monday": {"start": "08:00", "end": "17:00"}, "Tuesday": {"start": "08:00", "end": "17:00"}, "Wednesday": {"start": "08:00", "end": "17:00"}, "Thursday": {"start": "08:00", "end": "17:00"}, "Friday": {"start": "08:00", "end": "17:00"}, "Saturday": {"start": "09:00", "end": "14:00"}}'::jsonb,
     true),
    
    -- Receptionist
    ('33333333-3333-3333-3333-333333333305', 'Dilani Rathnayake', '0771234505', 'Receptionist', branch_uuid,
     ARRAY[]::uuid[],
     ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
     '{"Monday": {"start": "09:00", "end": "18:00"}, "Tuesday": {"start": "09:00", "end": "18:00"}, "Wednesday": {"start": "09:00", "end": "18:00"}, "Thursday": {"start": "09:00", "end": "18:00"}, "Friday": {"start": "09:00", "end": "18:00"}, "Saturday": {"start": "09:00", "end": "14:00"}}'::jsonb,
     true);
END $$;

-- ===============================
-- STEP 5: INSERT LOYALTY SETTINGS (Default)
-- ===============================

INSERT INTO loyalty_settings (
    option_card_enabled,
    option_points_enabled,
    option_visits_enabled,
    card_price,
    card_discount_percent,
    card_validity_days,
    points_threshold_amount,
    points_redemption_value,
    visit_reward_frequency,
    visit_reward_discount_percent
) VALUES (
    true,      -- Card enabled
    true,      -- Points enabled  
    true,      -- Visits enabled
    15000,     -- Card price Rs. 15,000
    10,        -- 10% discount with card
    365,       -- 1 year validity
    200,       -- Points threshold
    10,        -- Rs. 10 per point
    5,         -- Every 5 visits
    15         -- 15% discount reward
);

-- ===============================
-- STEP 6: INSERT DEFAULT CUSTOMER SEGMENTS
-- ===============================

INSERT INTO customer_segments (name, description, color, icon, is_active) VALUES
('VIP', 'High-value regular customers', '#8B5CF6', 'crown', true),
('Regular', 'Returning customers', '#3B82F6', 'users', true),
('New', 'First-time customers', '#10B981', 'user-plus', true),
('Inactive', 'Customers who haven''t visited recently', '#EF4444', 'user-minus', true);

-- ===============================
-- STEP 7: INSERT COMMISSION SETTINGS
-- ===============================

INSERT INTO commission_settings (role, commission_percentage, applies_to, is_active) VALUES
('Stylist', 20, 'services', true),
('Manager', 10, 'services', true);

-- ===============================
-- VERIFICATION QUERIES
-- ===============================

-- Check inserted data
SELECT 'Services' as table_name, COUNT(*) as count FROM services
UNION ALL SELECT 'Staff', COUNT(*) FROM staff
UNION ALL SELECT 'Branches', COUNT(*) FROM branches
UNION ALL SELECT 'Salon Settings', COUNT(*) FROM salon_settings
UNION ALL SELECT 'Loyalty Settings', COUNT(*) FROM loyalty_settings
UNION ALL SELECT 'Customer Segments', COUNT(*) FROM customer_segments
UNION ALL SELECT 'Commission Settings', COUNT(*) FROM commission_settings;
