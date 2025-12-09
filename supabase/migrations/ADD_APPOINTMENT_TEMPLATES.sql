-- ============================================
-- ADD APPOINTMENT & STAFF NOTIFICATION TEMPLATES
-- ============================================
-- Adds templates for:
-- - Stylist alert when appointment is booked
-- - Customer apology when appointment is cancelled
-- - Staff welcome email with credentials
-- ============================================

INSERT INTO notification_templates (name, type, channel, subject, message, is_active) VALUES
  
  -- Stylist Appointment Alert (SMS only)
  ('Stylist Appointment Alert', 'stylist_appointment_alert', 'sms', '', 
   '📅 New Appointment! Customer: {customer_name}, Service: {service}, Date: {date} at {time}. Duration: {duration} mins.', 
   true),
  
  -- Appointment Cancellation Apology (Both channels)
  ('Appointment Cancellation Apology', 'appointment_cancellation_apology', 'both', 'Appointment Cancelled - We Apologize', 
   'Dear {customer_name}, we sincerely apologize for the cancellation of your appointment on {date} at {time}. Reason: {reason}. Please call us to reschedule. We look forward to serving you!', 
   true),
  
  -- Staff Welcome Email (Email only)
  ('Staff Welcome Email', 'staff_welcome', 'email', 'Welcome to the Team!', 
   'Hello {name}! 👋 Welcome to our salon team! Your account has been created.\n\nLogin Details:\nEmail: {email}\nTemporary Password: {password}\nLogin URL: {login_url}\n\nPlease login and change your password immediately.\n\nWe''re excited to have you on board!', 
   true)
  
ON CONFLICT (type) DO UPDATE SET
  name = EXCLUDED.name,
  message = EXCLUDED.message,
  subject = EXCLUDED.subject,
  channel = EXCLUDED.channel,
  is_active = EXCLUDED.is_active;

-- Verification
SELECT 
    type,
    name,
    channel,
    is_active
FROM notification_templates
WHERE type IN ('stylist_appointment_alert', 'appointment_cancellation_apology', 'staff_welcome')
ORDER BY type;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ =============================================';
    RAISE NOTICE '✅ Notification templates added successfully!';
    RAISE NOTICE '✅ =============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Templates Added:';
    RAISE NOTICE '  1. Stylist Appointment Alert (SMS)';
    RAISE NOTICE '  2. Appointment Cancellation Apology (Both)';
    RAISE NOTICE '  3. Staff Welcome Email (Email)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 These templates are now ready for use!';
    RAISE NOTICE '';
END $$;
