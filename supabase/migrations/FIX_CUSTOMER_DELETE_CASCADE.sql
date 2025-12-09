-- ============================================
-- FIX CUSTOMER DELETION - CASCADE DELETE
-- ============================================
-- 
-- This script fixes the foreign key constraint issue when deleting customers.
-- It ensures that when a customer is deleted, all related campaign_sends are
-- automatically deleted as well.
-- 
-- Run this in Supabase SQL Editor to fix the issue.
-- ============================================

-- Drop the existing foreign key constraint
ALTER TABLE campaign_sends 
DROP CONSTRAINT IF EXISTS campaign_sends_customer_id_fkey;

-- Add the foreign key constraint with CASCADE delete
ALTER TABLE campaign_sends 
ADD CONSTRAINT campaign_sends_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE CASCADE;

-- Verify the constraint was created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'campaign_sends' 
    AND kcu.column_name = 'customer_id';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Foreign key constraint updated successfully!';
    RAISE NOTICE '📝 Customers can now be deleted along with their campaign sends';
    RAISE NOTICE '🔄 ON DELETE CASCADE is now active';
END $$;
