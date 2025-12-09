-- ============================================
-- CLEAN TESTING DATA (PRESERVE CONFIGURATION)
-- ============================================
-- This script removes all testing/operational data
-- but preserves:
-- - Services
-- - Salon Settings
-- - Staff accounts
-- - User accounts
-- ============================================

-- 1. Delete campaign-related data
DELETE FROM campaign_sends;
DELETE FROM campaigns;

-- 2. Delete customer-related transactional data
DELETE FROM invoices;
DELETE FROM appointments;
DELETE FROM stylist_availability;
DELETE FROM stylist_breaks;
DELETE FROM stylist_unavailability;

-- 3. Delete customers
DELETE FROM customers;

-- 4. Delete earnings data
DELETE FROM staff_earnings;

-- 5. Clean notification logs (if exists)
-- DELETE FROM notification_logs;

-- 6. Reset segment counts
UPDATE customer_segments
SET customer_count = 0
WHERE id IS NOT NULL;

-- 6. KEEP (Don't delete):
-- - services table
-- - salon_settings table
-- - staff table
-- - profiles table (user accounts)
-- - branches table
-- - promo_codes table
-- - notification_templates table
-- - commission_settings table

-- Verification
SELECT 'Appointments remaining' as table_name, COUNT(*) as count FROM appointments
UNION ALL
SELECT 'Invoices remaining', COUNT(*) FROM invoices
UNION ALL
SELECT 'Customers remaining', COUNT(*) FROM customers
UNION ALL
SELECT 'Campaigns remaining', COUNT(*) FROM campaigns
UNION ALL
SELECT 'Campaign sends remaining', COUNT(*) FROM campaign_sends
UNION ALL
SELECT 'Stylist availability remaining', COUNT(*) FROM stylist_availability
UNION ALL
SELECT 'Staff earnings remaining', COUNT(*) FROM staff_earnings
UNION ALL
SELECT 'Services remaining (preserved)', COUNT(*) FROM services
UNION ALL
SELECT 'Staff remaining (preserved)', COUNT(*) FROM staff
UNION ALL
SELECT 'Salon settings remaining (preserved)', COUNT(*) FROM salon_settings
UNION ALL
SELECT 'Segments remaining (preserved)', COUNT(*) FROM customer_segments
UNION ALL
SELECT 'Promo codes remaining (preserved)', COUNT(*) FROM promo_codes;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ==============================================';
    RAISE NOTICE '✅ Testing data cleaned successfully!';
    RAISE NOTICE '✅ ==============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Preserved:';
    RAISE NOTICE '  - Services';
    RAISE NOTICE '  - Salon Settings';
    RAISE NOTICE '  - Staff Accounts';
    RAISE NOTICE '  - User Profiles';
    RAISE NOTICE '  - Branches';
    RAISE NOTICE '  - Promo Codes';
    RAISE NOTICE '  - Notification Templates';
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Removed:';
    RAISE NOTICE '  - All Appointments';
    RAISE NOTICE '  - All Invoices';
    RAISE NOTICE '  - All Customers';
    RAISE NOTICE '  - All Campaigns';
    RAISE NOTICE '  - All Campaign Sends';
    RAISE NOTICE '  - All Stylist Availability Records';
    RAISE NOTICE '  - All Stylist Breaks';
    RAISE NOTICE '  - All Stylist Unavailability';
    RAISE NOTICE '  - All Staff Earnings';
    RAISE NOTICE '';
END $$;
