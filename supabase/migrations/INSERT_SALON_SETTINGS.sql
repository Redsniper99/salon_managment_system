-- ============================================
-- INSERT DEFAULT SALON SETTINGS
-- ============================================
-- 
-- This script inserts default salon settings required for the appointment booking system.
-- Run this in Supabase SQL Editor if you're getting "Error fetching salon settings"
-- ============================================

-- Clear any existing settings first (optional)
DELETE FROM salon_settings;

-- Insert default salon settings
INSERT INTO salon_settings (
    slot_interval,
    booking_window_days,
    booking_buffer_minutes,
    default_start_time,
    default_end_time
) VALUES (
    30,                 -- 30-minute time slots
    30,                 -- Allow bookings 30 days in advance
    10,                 -- 10-minute buffer between appointments
    '09:00:00',         -- Salon opens at 9:00 AM
    '18:00:00'          -- Salon closes at 6:00 PM
);

-- Verify the settings were inserted
SELECT * FROM salon_settings;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Default salon settings inserted successfully!';
    RAISE NOTICE '📅 Slot Interval: 30 minutes';
    RAISE NOTICE '📆 Booking Window: 30 days';
    RAISE NOTICE '⏰ Operating Hours: 9:00 AM - 6:00 PM';
    RAISE NOTICE '🔄 Buffer Time: 10 minutes';
END $$;

-- ============================================
-- CUSTOMIZATION GUIDE
-- ============================================
--
-- You can modify these settings based on your salon's needs:
--
-- slot_interval: Time slot duration (15, 30, or 60 minutes)
-- booking_window_days: How far in advance customers can book
-- booking_buffer_minutes: Gap between appointments
-- default_start_time: When your salon opens
-- default_end_time: When your salon closes
--
-- To update settings, run:
-- UPDATE salon_settings SET 
--     slot_interval = 15,
--     default_start_time = '08:00:00',
--     default_end_time = '20:00:00'
-- WHERE id = (SELECT id FROM salon_settings LIMIT 1);
--
-- ============================================
