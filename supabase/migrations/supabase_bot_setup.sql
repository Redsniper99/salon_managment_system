
-- Run this in your Supabase SQL Editor to enable the WhatsApp Bot
CREATE TABLE IF NOT EXISTS public.bot_sessions (
    phone_number TEXT PRIMARY KEY,
    status TEXT DEFAULT 'MENU', -- 'MENU', 'SELECT_SERVICE', 'SELECT_DATE', 'CONFIRM'
    temp_data JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (optional, but good practice)
ALTER TABLE public.bot_sessions ENABLE ROW LEVEL SECURITY;

-- Allow Service Role (API) to access it fully
CREATE POLICY "Service Role Full Access" ON public.bot_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
