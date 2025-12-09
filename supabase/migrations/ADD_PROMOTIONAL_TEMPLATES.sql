-- ============================================
-- ADD ALL NOTIFICATION TEMPLATES
-- ============================================
-- Adds templates for:
-- - Appointment confirmations, reminders, cancellations
-- - Promotional campaigns and marketing
-- ============================================

-- Insert ALL notification templates (Appointment + Promotional)
INSERT INTO notification_templates (name, type, channel, subject, message, is_active) VALUES
  
  -- ============================================
  -- APPOINTMENT-RELATED TEMPLATES
  -- ============================================
  
  -- Appointment Confirmation
  ('Appointment Confirmed', 'appointment_confirmation', 'both', 'Appointment Confirmed!', 
   'Hi {customer_name}! ✅ Your appointment is confirmed for {date} at {time} with {stylist}. Service: {service}. See you soon!', 
   true),
  
  -- Appointment Reminder
  ('Appointment Reminder', 'appointment_reminder', 'both', 'Reminder: Appointment Tomorrow', 
   'Hi {customer_name}! 📅 Reminder: You have an appointment tomorrow ({date}) at {time} with {stylist}. Looking forward to seeing you!', 
   true),
  
  -- Appointment Cancellation
  ('Appointment Cancelled', 'appointment_cancellation', 'both', 'Appointment Cancelled', 
   'Hi {customer_name}, your appointment on {date} at {time} has been cancelled. Please call us to reschedule. Thank you!', 
   true),
  
  -- ============================================
  -- PROMOTIONAL TEMPLATES (Each with unique type)
  -- ============================================
  
  -- General Promotion
  ('Weekend Special', 'promotional_weekend', 'both', 'Weekend Special Offer!', 
   'Hi {customer_name}! 🎉 This weekend only - Get 20% OFF on all services! Book now: Call us to reserve your spot.', 
   true),
  
  -- Birthday Promotion  
  ('Birthday Special', 'promotional_birthday', 'both', 'Happy Birthday {customer_name}! 🎂', 
   'Happy Birthday {customer_name}! 🎂 Celebrate with us - Enjoy a FREE haircut this month! Valid until end of your birthday month.', 
   true),
  
  -- Seasonal Promotion
  ('Seasonal Offer', 'promotional_seasonal', 'both', 'Seasonal Beauty Makeover', 
   'Hello {customer_name}! 🌸 New season, new look! Book any 2 services and get 15% OFF. Limited time offer!', 
   true),
  
  -- Loyalty Reward
  ('Loyalty Reward', 'promotional_loyalty', 'both', 'Thank You for Your Loyalty!', 
   'Dear {customer_name}, as a valued customer, enjoy 10% OFF your next visit! Show this message at checkout.', 
   true),
  
  -- New Service Launch
  ('New Service Launch', 'promotional_new_service', 'both', 'Exciting New Service!', 
   'Hi {customer_name}! ✨ We''re excited to introduce {service} - Try it now and get 25% OFF! Call to book your appointment.', 
   true),
  
  -- Re-engagement (Inactive customers)
  ('We Miss You', 'promotional_winback', 'both', 'We Miss You!', 
   'Hi {customer_name}, we haven''t seen you in a while! 😊 Come back and enjoy 15% OFF any service. We''d love to see you again!', 
   true),
  
  -- Referral Program
  ('Refer a Friend', 'promotional_referral', 'both', 'Bring a Friend, Get Rewards!', 
   'Hey {customer_name}! Refer a friend and you BOTH get 10% OFF on your next visit! Sharing is caring 💖', 
   true),
  
  -- Flash Sale
  ('Flash Sale', 'promotional_flash', 'sms', '', 
   '⚡ FLASH SALE ⚡ {customer_name}! Next 24 hours only - 30% OFF all services! Call NOW to book: Limited slots!', 
   true),
  
  -- Holiday Special
  ('Holiday Greetings', 'promotional_holiday', 'both', 'Season''s Greetings!', 
   'Happy Holidays {customer_name}! 🎄 Treat yourself this season - 20% OFF all festive makeover packages. Book your holiday look now!', 
   true),
  
  -- Package Deal
  ('Package Deal', 'promotional_package', 'both', 'Exclusive Package Deal!', 
   'Hi {customer_name}! 💎 Book our Premium Package (Haircut + Color + Spa Treatment) and save 30%! Pamper yourself today.', 
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
WHERE type LIKE 'promotional%' OR type LIKE 'appointment%'
ORDER BY 
    CASE 
        WHEN type LIKE 'appointment%' THEN 1
        WHEN type LIKE 'promotional%' THEN 2
    END,
    type;

-- Success message
DO $$
DECLARE
    appointment_count INTEGER;
    promotional_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO appointment_count FROM notification_templates 
    WHERE type IN ('appointment_confirmation', 'appointment_reminder', 'appointment_cancellation');
    
    SELECT COUNT(*) INTO promotional_count FROM notification_templates 
    WHERE type LIKE 'promotional%';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ =============================================';
    RAISE NOTICE '✅ Notification templates added successfully!';
    RAISE NOTICE '✅ =============================================';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Template Summary:';
    RAISE NOTICE '  - Appointment Templates: %', appointment_count;
    RAISE NOTICE '  - Promotional Templates: %', promotional_count;
    RAISE NOTICE '';
    RAISE NOTICE '📋 Appointment Templates:';
    RAISE NOTICE '  1. Appointment Confirmation';
    RAISE NOTICE '  2. Appointment Reminder';
    RAISE NOTICE '  3. Appointment Cancellation';
    RAISE NOTICE '';
    RAISE NOTICE '📢 Promotional Templates:';
    RAISE NOTICE '  1. Weekend Special (promotional_weekend)';
    RAISE NOTICE '  2. Birthday Special (promotional_birthday)';
    RAISE NOTICE '  3. Seasonal Offer (promotional_seasonal)';
    RAISE NOTICE '  4. Loyalty Reward (promotional_loyalty)';
    RAISE NOTICE '  5. New Service Launch (promotional_new_service)';
    RAISE NOTICE '  6. We Miss You (promotional_winback)';
    RAISE NOTICE '  7. Refer a Friend (promotional_referral)';
    RAISE NOTICE '  8. Flash Sale (promotional_flash)';
    RAISE NOTICE '  9. Holiday Greetings (promotional_holiday)';
    RAISE NOTICE ' 10. Package Deal (promotional_package)';
    RAISE NOTICE '';
    RAISE NOTICE '💡 Use these templates in appointments and campaigns!';
    RAISE NOTICE '';
END $$;
