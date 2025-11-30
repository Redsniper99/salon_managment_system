-- =====================================================
-- FIX AND SEED SCRIPT
-- 1. Fixes missing 'is_active' column
-- 2. Populates comprehensive test data for all segments
-- =====================================================

-- 1. SCHEMA FIXES
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. SEED DATA

-- Clean up existing data to avoid conflicts (Optional - comment out if you want to keep data)
-- TRUNCATE campaign_sends, campaigns, appointments, customers, services, staff CASCADE;

-- A. Services
INSERT INTO services (id, name, duration, price, category, description)
VALUES 
  (uuid_generate_v4(), 'Men''s Haircut', 30, 1500, 'Hair', 'Standard haircut for men'),
  (uuid_generate_v4(), 'Women''s Haircut', 60, 2500, 'Hair', 'Standard haircut for women'),
  (uuid_generate_v4(), 'Full Body Spa', 90, 8000, 'Spa', 'Relaxing full body massage'),
  (uuid_generate_v4(), 'Facial Treatment', 60, 5000, 'Facial', 'Rejuvenating facial'),
  (uuid_generate_v4(), 'Hair Coloring', 120, 12000, 'Hair', 'Full head hair coloring'),
  (uuid_generate_v4(), 'Manicure', 45, 3000, 'Spa', 'Standard manicure')
ON CONFLICT DO NOTHING;

-- B. Staff (Skipped to avoid auth.users FK constraint issues)
-- INSERT INTO profiles (id, email, role, name)
-- VALUES 
--   (uuid_generate_v4(), 'stylist1@salon.com', 'Stylist', 'Sarah Stylist'),
--   (uuid_generate_v4(), 'stylist2@salon.com', 'Stylist', 'Mike Barber')
-- ON CONFLICT DO NOTHING;

-- C. Customers (Targeting specific segments)

-- 1. Haircut Regular (3+ haircuts)
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent)
VALUES (uuid_generate_v4(), 'John Regular', 'john.reg@example.com', '+94771111111', true, 5, 7500);

-- 2. Beauty Enthusiast (Spa/Facial)
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent)
VALUES (uuid_generate_v4(), 'Lisa Beauty', 'lisa.b@example.com', '+94772222222', true, 3, 15000);

-- 3. VIP Customer (High spend)
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent)
VALUES (uuid_generate_v4(), 'Victor VIP', 'victor.vip@example.com', '+94773333333', true, 12, 55000);

-- 4. New Customer (1 visit)
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent)
VALUES (uuid_generate_v4(), 'Nancy New', 'nancy.new@example.com', '+94774444444', true, 1, 2500);

-- 5. Inactive Customer (No visits lately)
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent, last_visit_date)
VALUES (uuid_generate_v4(), 'Ian Inactive', 'ian.old@example.com', '+94775555555', true, 2, 5000, NOW() - INTERVAL '100 days');

-- 6. Color Specialist
INSERT INTO customers (id, name, email, phone, is_active, total_visits, total_spent)
VALUES (uuid_generate_v4(), 'Clara Color', 'clara.c@example.com', '+94776666666', true, 4, 48000);

-- D. Appointments (To trigger segmentation logic)
-- We need to link these to the customers we just created. 
-- Since UUIDs are random, we'll use a DO block to insert appointments for the specific customers above.

DO $$
DECLARE
  cust_regular UUID;
  cust_beauty UUID;
  cust_vip UUID;
  cust_color UUID;
  service_hair_m UUID;
  service_spa UUID;
  service_color UUID;
BEGIN
  -- Get IDs
  SELECT id INTO cust_regular FROM customers WHERE email = 'john.reg@example.com' LIMIT 1;
  SELECT id INTO cust_beauty FROM customers WHERE email = 'lisa.b@example.com' LIMIT 1;
  SELECT id INTO cust_vip FROM customers WHERE email = 'victor.vip@example.com' LIMIT 1;
  SELECT id INTO cust_color FROM customers WHERE email = 'clara.c@example.com' LIMIT 1;
  
  SELECT id INTO service_hair_m FROM services WHERE name = 'Men''s Haircut' LIMIT 1;
  SELECT id INTO service_spa FROM services WHERE name = 'Full Body Spa' LIMIT 1;
  SELECT id INTO service_color FROM services WHERE name = 'Hair Coloring' LIMIT 1;

  -- Insert Appointments for Regular (Haircuts)
  -- Note: Using dummy UUIDs for stylist_id and branch_id as we skipped creating them
  -- In a real scenario, these would be valid FKs. For testing segmentation, we might need to disable FK checks or insert dummy staff/branch first.
  -- However, since we can't easily insert staff due to auth, we will try to insert appointments with a dummy UUID if FK constraints allow, 
  -- OR we will skip appointments if strict FKs are enforced.
  -- Checking schema: stylist_id REFERENCES staff(id), branch_id REFERENCES branches(id).
  -- This means we DO need valid staff and branches.
  
  -- Let's try to insert a dummy branch and staff first (without profile_id to avoid auth issue)
  -- This assumes staff table allows null profile_id or we can insert one.
  
  -- 1. Create Dummy Branch
  INSERT INTO branches (id, name, address, phone) 
  VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Main Branch', '123 Main St', '555-0100')
  ON CONFLICT DO NOTHING;

  -- 2. Create Dummy Staff (No profile_id)
  INSERT INTO staff (id, name, phone, role, branch_id, email)
  VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Test Stylist', '555-0101', 'Stylist', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'stylist@test.com')
  ON CONFLICT DO NOTHING;

  -- 3. Insert Appointments
  INSERT INTO appointments (customer_id, services, status, stylist_id, branch_id, start_time, duration, appointment_date) VALUES 
  (cust_regular, ARRAY[service_hair_m], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10:00', 30, (NOW() - INTERVAL '1 month')::date),
  (cust_regular, ARRAY[service_hair_m], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10:00', 30, (NOW() - INTERVAL '2 months')::date),
  (cust_regular, ARRAY[service_hair_m], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '10:00', 30, (NOW() - INTERVAL '3 months')::date);

  -- Insert Appointments for Beauty (Spa)
  INSERT INTO appointments (customer_id, services, status, stylist_id, branch_id, start_time, duration, appointment_date) VALUES 
  (cust_beauty, ARRAY[service_spa], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '14:00', 90, (NOW() - INTERVAL '1 week')::date),
  (cust_beauty, ARRAY[service_spa], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '14:00', 90, (NOW() - INTERVAL '3 weeks')::date);

  -- Insert Appointments for Color
  INSERT INTO appointments (customer_id, services, status, stylist_id, branch_id, start_time, duration, appointment_date) VALUES 
  (cust_color, ARRAY[service_color], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11:00', 120, (NOW() - INTERVAL '2 months')::date),
  (cust_color, ARRAY[service_color], 'Completed', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '11:00', 120, (NOW() - INTERVAL '4 months')::date);

END $$;

-- E. Notification Templates
INSERT INTO notification_templates (name, type, channel, subject, message, is_active)
VALUES 
  ('Weekend Special', 'promotional', 'sms', 'Weekend Offer', 'Hi {customer_name}! Get 20% off all haircuts this weekend at SalonFlow. Book now!', true),
  ('We Miss You', 'promotional', 'email', 'Come back to SalonFlow', 'Hi {customer_name}, we haven''t seen you in a while! Here is a $10 voucher for your next visit.', true),
  ('VIP Exclusive', 'promotional', 'both', 'VIP Access', 'Dear {customer_name}, as a valued VIP, you have early access to our new spa treatments.', true)
ON CONFLICT DO NOTHING;

-- 3. REFRESH SEGMENTS
-- Force update of segment stats
SELECT refresh_segment_counts();
