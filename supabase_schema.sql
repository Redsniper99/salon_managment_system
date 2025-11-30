-- =====================================================
-- Salon Management System - Supabase Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. BRANCHES TABLE
-- =====================================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Receptionist', 'Stylist')),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. CUSTOMERS TABLE
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
  total_visits INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  last_visit TIMESTAMPTZ,
  preferences TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on phone for faster lookups
CREATE INDEX idx_customers_phone ON customers(phone);

-- =====================================================
-- 4. SERVICES TABLE
-- =====================================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Hair', 'Beard', 'Facial', 'Bridal', 'Kids', 'Spa', 'Other')),
  price DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Unisex')),
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. STAFF TABLE
-- =====================================================
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Receptionist', 'Stylist')),
  branch_id UUID REFERENCES branches(id),
  specializations UUID[] DEFAULT '{}', -- Array of service IDs
  working_days TEXT[] DEFAULT '{}',
  working_hours JSONB, -- {start: "09:00", end: "18:00"}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. APPOINTMENTS TABLE
-- =====================================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  stylist_id UUID REFERENCES staff(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  services UUID[] NOT NULL, -- Array of service IDs
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  status TEXT NOT NULL DEFAULT 'Pending' 
    CHECK (status IN ('Pending', 'Confirmed', 'InService', 'Completed', 'Cancelled', 'NoShow')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_stylist ON appointments(stylist_id);

-- =====================================================
-- 7. INVOICES TABLE
-- =====================================================
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  items JSONB NOT NULL, -- [{type, serviceId, description, price, quantity}]
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  promo_code TEXT,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'BankTransfer', 'UPI', 'Other')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invoice number for quick lookups
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_date ON invoices(created_at);

-- =====================================================
-- 8. PROMO CODES TABLE
-- =====================================================
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL,
  min_spend DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- BRANCHES: All authenticated users can view branches
CREATE POLICY "All users can view branches"
  ON branches FOR SELECT
  TO authenticated
  USING (true);

-- CUSTOMERS: All authenticated users can view/manage customers
CREATE POLICY "All users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true);

-- SERVICES: All authenticated users can view services
CREATE POLICY "All users can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- Owner/Manager can update services
CREATE POLICY "Managers can update services"
  ON services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

-- STAFF: All users can view staff
CREATE POLICY "All users can view staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

-- APPOINTMENTS: Owner/Manager can view all
CREATE POLICY "Managers can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager', 'Receptionist')
    )
  );

-- Stylists can view their own appointments
CREATE POLICY "Stylists can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    stylist_id IN (
      SELECT id FROM staff WHERE profile_id = auth.uid()
    )
  );

-- All staff can create/update appointments
CREATE POLICY "All staff can manage appointments"
  ON appointments FOR ALL
  TO authenticated
  USING (true);

-- INVOICES: All authenticated users can view/create invoices
CREATE POLICY "All users can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (true);

-- PROMO CODES: All users can view active promos
CREATE POLICY "All users can view promo codes"
  ON promo_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only Owner/Manager can manage promo codes
CREATE POLICY "Managers can manage promo codes"
  ON promo_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('Owner', 'Manager')
    )
  );

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for appointments
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('invoice_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

-- Trigger for invoice number generation
CREATE TRIGGER set_invoice_number BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- SEED DATA (Optional - for testing)
-- =====================================================

-- Insert default branch
INSERT INTO branches (name, address, phone) VALUES
  ('Main Branch', '123 Beauty Street, City', '+1234567890');

-- Insert sample services
INSERT INTO services (name, category, price, duration, gender) VALUES
  ('Hair Cut', 'Hair', 500, 30, 'Unisex'),
  ('Hair Styling', 'Hair', 800, 45, 'Unisex'),
  ('Hair Coloring', 'Hair', 2000, 90, 'Unisex'),
  ('Beard Trim', 'Beard', 300, 20, 'Male'),
  ('Facial Treatment', 'Facial', 1500, 60, 'Unisex'),
  ('Bridal Makeup', 'Bridal', 5000, 120, 'Female');
