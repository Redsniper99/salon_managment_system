-- ============================================
-- CLEAR ALL SYSTEM DATA - START FRESH
-- ============================================
-- 
-- WARNING: This script will DELETE ALL DATA from your salon management system!
-- Use this to start with a clean database for testing or production setup.
-- 
-- IMPORTANT: Run this script in your Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/YOUR-PROJECT/sql/new
-- 
-- Steps to use:
-- 1. Back up any data you want to keep first!
-- 2. Copy this entire script
-- 3. Paste into Supabase SQL Editor
-- 4. Click "Run" to execute
-- ============================================

BEGIN;

-- ============================================
-- CLEAR ALL DATA (respecting foreign key constraints)
-- ============================================

-- Clear campaign-related data first
DELETE FROM campaign_sends;
DELETE FROM campaigns;

-- Clear financial data (depends on appointments and customers)
DELETE FROM invoices;

-- Clear appointments (depends on customers and staff)
DELETE FROM appointments;

-- Clear staff-related data
DELETE FROM staff_earnings;
DELETE FROM stylist_availability;
DELETE FROM stylist_breaks;
DELETE FROM stylist_unavailability;
DELETE FROM salary_settings;

-- Clear staff (depends on profiles and branches)
DELETE FROM staff;

-- Clear customers
DELETE FROM customers;

-- Clear customer segments
DELETE FROM customer_segments;

-- Clear notification templates
DELETE FROM notification_templates;

-- Clear password reset OTPs
DELETE FROM password_change_otps;

-- Clear promo codes
DELETE FROM promo_codes;

-- Clear commission settings
DELETE FROM commission_settings;

-- Clear salon settings (keeps 1 row typically, but clearing anyway)
DELETE FROM salon_settings;

-- Clear services
DELETE FROM services;

-- Clear profiles (be careful - this removes user profiles!)
-- Uncomment the line below if you want to delete user profiles too
-- DELETE FROM profiles;

-- Clear branches (be careful - this removes branch data!)
-- Uncomment the line below if you want to delete branches too
-- DELETE FROM branches;

-- ============================================
-- VERIFY DATA DELETION
-- ============================================

-- Count remaining rows in each table
-- All counts should be 0 (except profiles and branches if not deleted)

SELECT 
    'customers' as table_name, 
    COUNT(*) as row_count 
FROM customers

UNION ALL

SELECT 
    'appointments' as table_name, 
    COUNT(*) as row_count 
FROM appointments

UNION ALL

SELECT 
    'invoices' as table_name, 
    COUNT(*) as row_count 
FROM invoices

UNION ALL

SELECT 
    'services' as table_name, 
    COUNT(*) as row_count 
FROM services

UNION ALL

SELECT 
    'staff' as table_name, 
    COUNT(*) as row_count 
FROM staff

UNION ALL

SELECT 
    'campaigns' as table_name, 
    COUNT(*) as row_count 
FROM campaigns

UNION ALL

SELECT 
    'campaign_sends' as table_name, 
    COUNT(*) as row_count 
FROM campaign_sends

UNION ALL

SELECT 
    'customer_segments' as table_name, 
    COUNT(*) as row_count 
FROM customer_segments

UNION ALL

SELECT 
    'notification_templates' as table_name, 
    COUNT(*) as row_count 
FROM notification_templates

UNION ALL

SELECT 
    'promo_codes' as table_name, 
    COUNT(*) as row_count 
FROM promo_codes

UNION ALL

SELECT 
    'staff_earnings' as table_name, 
    COUNT(*) as row_count 
FROM staff_earnings

UNION ALL

SELECT 
    'profiles' as table_name, 
    COUNT(*) as row_count 
FROM profiles

UNION ALL

SELECT 
    'branches' as table_name, 
    COUNT(*) as row_count 
FROM branches

ORDER BY table_name;

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 
-- 1. This does NOT delete:
--    - Database schema/structure
--    - RLS policies
--    - Functions and triggers
--    - User accounts (auth.users)
-- 
-- 2. After running this script:
--    - You can immediately start adding new data
--    - All tables will be empty but functional
--    - RLS policies remain in effect
--    - Triggers continue to work
-- 
-- 3. To delete user accounts too:
--    Go to Authentication → Users in Supabase dashboard
--    and manually delete users
-- 
-- ============================================

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ All system data has been cleared successfully!';
    RAISE NOTICE '📝 Database structure and policies remain intact';
    RAISE NOTICE '🚀 Ready for fresh data entry';
END $$;
