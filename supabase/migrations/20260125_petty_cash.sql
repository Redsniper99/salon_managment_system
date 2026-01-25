-- Petty Cash Management System
-- Tracks deposits and withdrawals from salon petty cash

-- Create petty cash transactions table
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    branch_id UUID REFERENCES branches(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_created_at 
    ON petty_cash_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_branch 
    ON petty_cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_transactions_type 
    ON petty_cash_transactions(type);

-- Enable RLS
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view all transactions
CREATE POLICY "petty_cash_view" ON petty_cash_transactions
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Policy: Allow authenticated users to insert transactions
CREATE POLICY "petty_cash_insert" ON petty_cash_transactions
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Only owners/managers can delete transactions
CREATE POLICY "petty_cash_delete" ON petty_cash_transactions
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('Owner', 'Manager')
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_petty_cash_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_petty_cash_updated_at_trigger
    BEFORE UPDATE ON petty_cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_updated_at();
