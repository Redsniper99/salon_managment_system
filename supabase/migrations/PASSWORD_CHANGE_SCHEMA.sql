-- =====================================================
-- PASSWORD CHANGE OTP SCHEMA
-- Secure password changes with email verification
-- =====================================================

-- Create OTP storage table
CREATE TABLE IF NOT EXISTS password_change_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_user_expiry ON password_change_otps(user_id, expires_at) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_otp_email ON password_change_otps(email) WHERE NOT used;

-- Enable RLS
ALTER TABLE password_change_otps ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own OTPs
CREATE POLICY "users_select_own_otps" ON password_change_otps
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_otps" ON password_change_otps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired OTPs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM password_change_otps
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Comments
COMMENT ON TABLE password_change_otps IS 'Stores one-time passwords for secure password changes';
COMMENT ON COLUMN password_change_otps.otp IS '6-digit verification code';
COMMENT ON COLUMN password_change_otps.expires_at IS 'OTP expires after 5 minutes';
COMMENT ON COLUMN password_change_otps.used IS 'Marks OTP as consumed after successful use';
