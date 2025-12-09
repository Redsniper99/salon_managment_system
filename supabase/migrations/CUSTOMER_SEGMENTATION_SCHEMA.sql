-- =====================================================
-- CUSTOMER SEGMENTATION SYSTEM - DATABASE SCHEMA
-- Phase 1: Customer Segmentation
-- =====================================================

-- 1. CUSTOMER SEGMENTS TABLE
-- Defines different customer categories
CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'users',
  auto_criteria JSONB, -- Criteria for auto-categorization
  is_active BOOLEAN DEFAULT true,
  customer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MODIFY CUSTOMERS TABLE
-- Add segmentation fields to existing customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS segment_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_visit_date DATE,
ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_services TEXT[] DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_segments ON customers USING GIN(segment_tags);
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit_date);
CREATE INDEX IF NOT EXISTS idx_customers_total_visits ON customers(total_visits);

-- 3. INSERT DEFAULT SEGMENTS
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
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

ALTER TABLE customer_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view segments"
  ON customer_segments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owner can manage segments"
  ON customer_segments FOR ALL
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
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update customer statistics
CREATE OR REPLACE FUNCTION update_customer_stats(customer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET 
    total_visits = (
      SELECT COUNT(*) 
      FROM appointments 
      WHERE customer_id = $1 AND status = 'completed'
    ),
    total_spent = (
      SELECT COALESCE(SUM(total), 0)
      FROM invoices
      WHERE customer_id = $1
    ),
    last_visit_date = (
      SELECT MAX(date)
      FROM appointments
      WHERE customer_id = $1 AND status = 'completed'
    )
  WHERE id = $1;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh segment counts
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
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOTES
-- =====================================================

-- After running this migration:
-- 1. Run the segmentation service to auto-categorize customers
-- 2. Verify segment counts are correct
-- 3. Check customer stats are populated
