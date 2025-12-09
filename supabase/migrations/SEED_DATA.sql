-- SEED DATA FOR SALON MANAGEMENT SYSTEM

-- 1. Create Services
INSERT INTO services (name, description, duration, price, category, is_active) VALUES
('Men''s Haircut', 'Standard men''s haircut with styling', 30, 2500, 'Hair', true),
('Women''s Haircut', 'Standard women''s haircut with blow dry', 60, 4500, 'Hair', true),
('Hair Coloring', 'Full head hair coloring', 120, 15000, 'Hair', true),
('Beard Trim', 'Professional beard trimming and shaping', 20, 1500, 'Beard', true),
('Facial Cleanse', 'Deep cleansing facial treatment', 45, 6000, 'Facial', true),
('Bridal Makeup', 'Complete bridal makeup package', 180, 35000, 'Bridal', true),
('Manicure', 'Classic manicure service', 45, 3500, 'Spa', true),
('Pedicure', 'Classic pedicure service', 60, 4000, 'Spa', true);

-- 2. Create Customers
INSERT INTO customers (name, phone, email, gender, total_visits, total_spent, last_visit) VALUES
('Anjali Perera', '+94 77 123 4567', 'anjali@example.com', 'Female', 12, 18500, NOW() - INTERVAL '5 days'),
('Kasun Silva', '+94 77 234 5678', 'kasun@example.com', 'Male', 8, 6200, NOW() - INTERVAL '12 days'),
('Nimal Fernando', '+94 77 345 6789', 'nimal@example.com', 'Male', 15, 22000, NOW() - INTERVAL '2 days'),
('Dilani Jayasinghe', '+94 71 456 7890', 'dilani@example.com', 'Female', 3, 12500, NOW() - INTERVAL '20 days'),
('Ruwan Pradeep', '+94 76 567 8901', 'ruwan@example.com', 'Male', 1, 2500, NOW() - INTERVAL '1 month');

-- 3. Create Staff (Stylists)
-- We insert directly into staff table. profile_id can be NULL for seed data if no auth user exists yet.
INSERT INTO staff (name, email, phone, role, branch_id, is_active, specializations, working_days, working_hours)
SELECT 
    'Sarah Johnson', 'sarah@salonflow.com', '+94 77 111 2222', 'Stylist', id, true, 
    ARRAY(SELECT id FROM services WHERE category = 'Hair' LIMIT 2),
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    '{"start": "09:00", "end": "17:00"}'::jsonb
FROM branches LIMIT 1;

INSERT INTO staff (name, email, phone, role, branch_id, is_active, specializations, working_days, working_hours)
SELECT 
    'Mike Smith', 'mike@salonflow.com', '+94 77 333 4444', 'Stylist', id, true,
    ARRAY(SELECT id FROM services WHERE category = 'Beard' OR category = 'Hair' LIMIT 2),
    ARRAY['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    '{"start": "10:00", "end": "19:00"}'::jsonb
FROM branches LIMIT 1;

INSERT INTO staff (name, email, phone, role, branch_id, is_active, specializations, working_days, working_hours)
SELECT 
    'Emily Davis', 'emily@salonflow.com', '+94 77 555 6666', 'Stylist', id, true,
    ARRAY(SELECT id FROM services WHERE category = 'Bridal' OR category = 'Facial' LIMIT 2),
    ARRAY['Saturday', 'Sunday', 'Monday', 'Tuesday'],
    '{"start": "09:00", "end": "18:00"}'::jsonb
FROM branches LIMIT 1;

-- 4. Create Appointments
INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status)
SELECT 
    c.id as customer_id,
    (SELECT id FROM staff WHERE email = 'mike@salonflow.com' LIMIT 1) as stylist_id,
    (SELECT id FROM branches LIMIT 1) as branch_id,
    ARRAY[(SELECT id FROM services WHERE name = 'Men''s Haircut' LIMIT 1)]::uuid[] as services,
    CURRENT_DATE as appointment_date,
    '10:00' as start_time,
    30 as duration,
    'Confirmed' as status
FROM customers c WHERE c.name = 'Kasun Silva';

INSERT INTO appointments (customer_id, stylist_id, branch_id, services, appointment_date, start_time, duration, status)
SELECT 
    c.id as customer_id,
    (SELECT id FROM staff WHERE email = 'sarah@salonflow.com' LIMIT 1) as stylist_id,
    (SELECT id FROM branches LIMIT 1) as branch_id,
    ARRAY[(SELECT id FROM services WHERE name = 'Women''s Haircut' LIMIT 1)]::uuid[] as services,
    CURRENT_DATE + INTERVAL '1 day' as appointment_date,
    '14:00' as start_time,
    60 as duration,
    'Pending' as status
FROM customers c WHERE c.name = 'Anjali Perera';

-- 5. Create Invoices (to populate reports)
INSERT INTO invoices (invoice_number, customer_id, branch_id, items, subtotal, tax, total, payment_method, created_at)
SELECT 
    'INV-SEED-001',
    c.id,
    (SELECT id FROM branches LIMIT 1),
    '[{"type": "service", "description": "Men''s Haircut", "price": 2500, "quantity": 1}]'::jsonb,
    2500,
    125,
    2625,
    'Cash',
    NOW() - INTERVAL '2 days'
FROM customers c WHERE c.name = 'Kasun Silva';

INSERT INTO invoices (invoice_number, customer_id, branch_id, items, subtotal, tax, total, payment_method, created_at)
SELECT 
    'INV-SEED-002',
    c.id,
    (SELECT id FROM branches LIMIT 1),
    '[{"type": "service", "description": "Hair Coloring", "price": 15000, "quantity": 1}]'::jsonb,
    15000,
    750,
    15750,
    'Card',
    NOW() - INTERVAL '5 days'
FROM customers c WHERE c.name = 'Anjali Perera';
