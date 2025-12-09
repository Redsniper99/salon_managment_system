-- ============================================
-- SEED SALON SERVICES
-- ============================================
-- 
-- This script adds common salon services with realistic pricing
-- Run this after clearing data to quickly set up your services
-- 
-- Prices are in LKR (Sri Lankan Rupees)
-- Durations are in minutes
-- ============================================

BEGIN;

-- ============================================
-- HAIR SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
-- Men's Hair Services
('Basic Haircut', 'Hair', 500, 30, 'Male', 'Standard men''s haircut with styling', true),
('Premium Haircut', 'Hair', 800, 45, 'Male', 'Premium haircut with wash and styling', true),
('Hair Wash', 'Hair', 200, 15, 'Male', 'Hair wash and blow dry', true),
('Hair Coloring', 'Hair', 2500, 90, 'Male', 'Full hair coloring service', true),
('Hair Highlights', 'Hair', 3000, 120, 'Male', 'Hair highlights and styling', true),

-- Women's Hair Services
('Ladies Haircut', 'Hair', 800, 45, 'Female', 'Women''s haircut with styling', true),
('Hair Wash & Blow Dry', 'Hair', 500, 30, 'Female', 'Shampoo, conditioning, and blow dry', true),
('Hair Straightening', 'Hair', 4000, 180, 'Female', 'Professional hair straightening', true),
('Hair Curling', 'Hair', 2500, 90, 'Female', 'Hair curling and styling', true),
('Keratin Treatment', 'Hair', 8000, 240, 'Female', 'Keratin smoothing treatment', true),
('Hair Rebonding', 'Hair', 6000, 240, 'Female', 'Professional hair rebonding', true),
('Hair Spa', 'Hair', 2000, 60, 'Female', 'Deep conditioning hair spa treatment', true),

-- Unisex Hair Services
('Head Massage', 'Hair', 500, 20, 'Unisex', 'Relaxing head massage', true),
('Dandruff Treatment', 'Hair', 1000, 45, 'Unisex', 'Specialized dandruff treatment', true);

-- ============================================
-- BEARD SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
('Beard Trim', 'Beard', 250, 15, 'Male', 'Professional beard trimming and shaping', true),
('Beard Styling', 'Beard', 400, 25, 'Male', 'Beard styling with grooming', true),
('Shaving', 'Beard', 300, 20, 'Male', 'Traditional shaving service', true),
('Beard Coloring', 'Beard', 800, 30, 'Male', 'Beard color and styling', true),
('Haircut + Beard Combo', 'Beard', 700, 40, 'Male', 'Haircut and beard trim combo', true);

-- ============================================
-- FACIAL SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
-- Men's Facial
('Basic Facial', 'Facial', 1000, 45, 'Male', 'Cleansing and moisturizing facial', true),
('Deep Cleansing Facial', 'Facial', 1500, 60, 'Male', 'Deep cleansing with blackhead removal', true),
('Anti-Aging Facial', 'Facial', 2500, 75, 'Male', 'Anti-aging treatment facial', true),

-- Women's Facial
('Gold Facial', 'Facial', 3500, 90, 'Female', 'Luxury gold facial treatment', true),
('Diamond Facial', 'Facial', 4000, 90, 'Female', 'Premium diamond facial', true),
('Fruit Facial', 'Facial', 1800, 60, 'Female', 'Natural fruit facial', true),
('Acne Treatment Facial', 'Facial', 2000, 75, 'Female', 'Specialized acne treatment', true),
('Bridal Facial', 'Facial', 3000, 90, 'Female', 'Pre-bridal glow facial', true),

-- Unisex Facial
('O3+ Facial', 'Facial', 2500, 60, 'Unisex', 'Oxygen facial treatment', true);

-- ============================================
-- BRIDAL SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
('Bridal Makeup', 'Bridal', 15000, 180, 'Female', 'Complete bridal makeup package', true),
('Bridal Hair Styling', 'Bridal', 5000, 120, 'Female', 'Bridal hairstyling and decoration', true),
('Bridal Package', 'Bridal', 25000, 360, 'Female', 'Complete bridal makeup, hair, and saree draping', true),
('Pre-Bridal Package', 'Bridal', 12000, 240, 'Female', 'Pre-wedding beauty treatment package', true),
('Groom Package', 'Bridal', 5000, 90, 'Male', 'Grooming package for groom', true),
('Engagement Makeup', 'Bridal', 8000, 120, 'Female', 'Makeup for engagement ceremony', true);

-- ============================================
-- KIDS SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
('Kids Haircut', 'Kids', 400, 25, 'Unisex', 'Haircut for children under 12', true),
('Kids Hair Styling', 'Kids', 600, 30, 'Unisex', 'Hair styling for special occasions', true),
('First Haircut Ceremony', 'Kids', 1500, 45, 'Unisex', 'Traditional first haircut ceremony', true);

-- ============================================
-- SPA SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
('Body Massage', 'Spa', 3000, 60, 'Unisex', 'Full body relaxation massage', true),
('Foot Massage', 'Spa', 1000, 30, 'Unisex', 'Relaxing foot and leg massage', true),
('Face & Neck Massage', 'Spa', 800, 25, 'Unisex', 'Face and neck massage', true),
('Aroma Therapy', 'Spa', 2500, 60, 'Unisex', 'Aromatherapy massage with essential oils', true),
('Hot Stone Massage', 'Spa', 3500, 75, 'Unisex', 'Hot stone therapy massage', true);

-- ============================================
-- OTHER SERVICES
-- ============================================

INSERT INTO services (name, category, price, duration, gender, description, is_active) VALUES
('Threading', 'Other', 150, 15, 'Female', 'Eyebrow threading', true),
('Waxing - Full Arms', 'Other', 800, 30, 'Female', 'Full arms waxing', true),
('Waxing - Full Legs', 'Other', 1200, 45, 'Female', 'Full legs waxing', true),
('Waxing - Underarms', 'Other', 300, 15, 'Female', 'Underarm waxing', true),
('Waxing - Full Body', 'Other', 3000, 120, 'Female', 'Complete body waxing', true),
('Manicure', 'Other', 800, 45, 'Female', 'Hand manicure with nail polish', true),
('Pedicure', 'Other', 1000, 60, 'Female', 'Foot pedicure with nail polish', true),
('Mani-Pedi Combo', 'Other', 1600, 90, 'Female', 'Manicure and pedicure combo', true),
('Nail Art', 'Other', 500, 30, 'Female', 'Decorative nail art', true),
('Mehendi (Henna)', 'Other', 1500, 60, 'Female', 'Traditional henna art', true),
('Ear Piercing', 'Other', 500, 15, 'Unisex', 'Ear piercing service', true);

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Count services by category
SELECT 
    category,
    COUNT(*) as service_count,
    MIN(price) as min_price,
    MAX(price) as max_price,
    AVG(duration)::integer as avg_duration_minutes
FROM services
WHERE is_active = true
GROUP BY category
ORDER BY category;

-- Show total services added
SELECT 
    COUNT(*) as total_services,
    SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) as male_services,
    SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) as female_services,
    SUM(CASE WHEN gender = 'Unisex' THEN 1 ELSE 0 END) as unisex_services
FROM services
WHERE is_active = true;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Salon services added successfully!';
    RAISE NOTICE '📊 Check the summary above for service counts';
    RAISE NOTICE '💈 Ready to start booking appointments';
END $$;
