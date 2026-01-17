-- Add commission column to staff table for individual stylist commission rates
-- This allows each stylist to have their own commission percentage

ALTER TABLE staff 
ADD COLUMN commission DECIMAL(5,2) DEFAULT NULL;

COMMENT ON COLUMN staff.commission IS 'Individual commission percentage for this staff member (primarily for Stylists). If NULL, falls back to role-based commission_settings.';

-- Update any existing stylists to use the default commission rate from commission_settings
UPDATE staff 
SET commission = (
    SELECT commission_percentage 
    FROM commission_settings 
    WHERE role = 'Stylist' 
    AND is_active = true 
    LIMIT 1
)
WHERE role = 'Stylist' AND commission IS NULL;
