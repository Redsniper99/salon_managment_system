-- Inventory/Products Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL DEFAULT 'Supplies',
  description TEXT,
  sku VARCHAR(100) UNIQUE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  unit VARCHAR(50) DEFAULT 'units',
  cost_per_unit DECIMAL(10,2) DEFAULT 0,
  selling_price DECIMAL(10,2) DEFAULT 0,
  supplier VARCHAR(255),
  last_restocked_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Stock Movement History
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_id UUID REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_level ON inventory(current_stock);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);

-- RLS Policies (if Row Level Security is enabled)
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated read inventory" ON inventory;
DROP POLICY IF EXISTS "Allow authenticated manage inventory" ON inventory;
DROP POLICY IF EXISTS "Allow authenticated read inventory_transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Allow authenticated insert inventory_transactions" ON inventory_transactions;

-- Allow authenticated users to read inventory
CREATE POLICY "Allow authenticated read inventory" ON inventory
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update inventory (can be restricted further by role)
CREATE POLICY "Allow authenticated manage inventory" ON inventory
  FOR ALL TO authenticated USING (true);

-- Allow authenticated read transactions
CREATE POLICY "Allow authenticated read inventory_transactions" ON inventory_transactions
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated insert transactions
CREATE POLICY "Allow authenticated insert inventory_transactions" ON inventory_transactions
  FOR INSERT TO authenticated WITH CHECK (true);

COMMENT ON TABLE inventory IS 'Stores salon products and supplies inventory';
COMMENT ON TABLE inventory_transactions IS 'Tracks all inventory movements (restocks, sales, adjustments)';
