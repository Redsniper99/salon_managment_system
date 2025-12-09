-- =====================================================
-- SCHEMA UPDATES FOR NEW FEATURES
-- Run this in Supabase SQL Editor to add new tables
-- =====================================================

-- 1. STAFF EARNINGS TABLE
-- Tracks daily earnings for each staff member
CREATE TABLE staff_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) NOT NULL,
  date DATE NOT NULL,
  service_revenue DECIMAL(10,2) DEFAULT 0,
  commission_amount DECIMAL(10,2) DEFAULT 0,
  salary_amount DECIMAL(10,2) DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  appointments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

CREATE INDEX idx_staff_earnings_staff ON staff_earnings(staff_id);
CREATE INDEX idx_staff_earnings_date ON staff_earnings(date);

-- 2. SALARY SETTINGS TABLE
-- Stores salary configuration for non-stylist staff
CREATE TABLE salary_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id UUID REFERENCES staff(id) NOT NULL UNIQUE,
  salary_type TEXT NOT NULL CHECK (salary_type IN ('daily', 'monthly')),
  amount DECIMAL(10,2) NOT NULL,
  effective_from DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COMMISSION SETTINGS TABLE
-- Global commission settings (can be adjusted)
CREATE TABLE commission_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('Stylist', 'Manager', 'Receptionist', 'Owner')),
  commission_percentage DECIMAL(5,2) DEFAULT 0,
  applies_to TEXT DEFAULT 'services',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATION TEMPLATES TABLE
-- Customizable notification templates
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('appointment_confirmation', 'appointment_reminder', 'appointment_cancellation', 'promotional')),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'both')),
  subject TEXT,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Staff Earnings
ALTER TABLE staff_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own earnings"
  ON staff_earnings FOR SELECT
  TO authenticated
  USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Managers can view all earnings"
  ON staff_earnings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

CREATE POLICY "System can insert earnings"
  ON staff_earnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update earnings"
  ON staff_earnings FOR UPDATE
  TO authenticated
  USING (true);

-- Salary Settings
ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own salary"
  ON salary_settings FOR SELECT
  TO authenticated
  USING (
    staff_id IN (SELECT id FROM staff WHERE profile_id = auth.uid())
  );

CREATE POLICY "Owner can manage salaries"
  ON salary_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Owner'
    )
  );

-- Commission Settings
ALTER TABLE commission_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All can view commission settings"
  ON commission_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can manage commission"
  ON commission_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'Owner'
    )
  );

-- Notification Templates
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All can view templates"
  ON notification_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can manage templates"
  ON notification_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

-- =====================================================
-- SEED DATA
-- =====================================================

-- Seed default commission settings
INSERT INTO commission_settings (role, commission_percentage, applies_to) VALUES
  ('Stylist', 40.00, 'services'),
  ('Manager', 0.00, 'services'),
  ('Receptionist', 0.00, 'services'),
  ('Owner', 0.00, 'services');

-- Seed default notification templates
INSERT INTO notification_templates (name, type, channel, message) VALUES
  ('Appointment Confirmation', 'appointment_confirmation', 'sms', 'Hi {customer_name}! Your appointment is confirmed for {date} at {time} with {stylist}. See you at SalonFlow!'),
  ('Appointment Reminder', 'appointment_reminder', 'sms', 'Reminder: You have an appointment tomorrow at {time} with {stylist}. Looking forward to seeing you at SalonFlow!'),
  ('Appointment Cancellation', 'appointment_cancellation', 'sms', 'Hi {customer_name}, your appointment on {date} at {time} has been cancelled. Please call us to reschedule.'),
  ('Promotional', 'promotional', 'sms', 'Hi {customer_name}! Special offer just for you: Get 20% off on your next visit to SalonFlow!');

-- Seed sample salary settings for non-stylist staff
-- Note: Replace staff IDs with actual IDs from your staff table
INSERT INTO salary_settings (staff_id, salary_type, amount, effective_from)
SELECT id, 'daily', 2000, CURRENT_DATE
FROM staff WHERE role IN ('Manager', 'Receptionist') AND is_active = true;

-- Create initial earnings records for current month
-- This will be automatically updated when invoices are created
INSERT INTO staff_earnings (staff_id, date, service_revenue, commission_amount, salary_amount, total_earnings, appointments_count)
SELECT s.id, CURRENT_DATE, 0, 0, 0, 0, 0
FROM staff s WHERE s.is_active = true
ON CONFLICT (staff_id, date) DO NOTHING;
