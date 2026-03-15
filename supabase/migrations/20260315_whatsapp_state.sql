-- Add appointment state tracking to bot sessions
ALTER TABLE bot_sessions 
ADD COLUMN IF NOT EXISTS appointment_state JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMPTZ DEFAULT NOW();
