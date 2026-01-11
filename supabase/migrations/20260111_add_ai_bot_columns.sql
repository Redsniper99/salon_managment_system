
-- Run this in your Supabase SQL Editor to support AI Conversation History
ALTER TABLE public.bot_sessions 
ADD COLUMN IF NOT EXISTS conversation_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id),
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;

-- Update existing records if any
UPDATE public.bot_sessions SET conversation_history = '[]'::jsonb WHERE conversation_history IS NULL;
