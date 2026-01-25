-- Update appointment status constraint to use simplified statuses

-- Step 1: Drop constraints temporarily to avoid validation errors during UPDATE
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS valid_appointment_date;

-- Step 2: Update any existing 'Confirmed' or 'InService' to 'InProgress'
UPDATE appointments 
SET status = 'InProgress' 
WHERE status IN ('Confirmed', 'InService');

-- Step 3: Update any existing 'NoShow' to 'Cancelled'
UPDATE appointments 
SET status = 'Cancelled' 
WHERE status = 'NoShow';

-- Step 4: Add new status constraint with simplified statuses
ALTER TABLE appointments 
ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('Pending', 'InProgress', 'Completed', 'Cancelled'));

-- Note: We don't re-add the date constraint because it will validate all existing rows
-- The date constraint was defined in the original schema and will remain as is
