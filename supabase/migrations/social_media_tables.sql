-- =============================================
-- SOCIAL MEDIA STORIES FEATURE
-- Run this script in Supabase SQL Editor
-- =============================================

-- Social Media Settings (connection, logo)
CREATE TABLE IF NOT EXISTS social_media_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facebook_page_id VARCHAR,
    facebook_page_token VARCHAR,
    instagram_account_id VARCHAR,
    is_connected BOOLEAN DEFAULT false,
    logo_url VARCHAR,
    logo_position VARCHAR DEFAULT 'bottom-right',
    logo_size INTEGER DEFAULT 80,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Caption Templates (reusable captions)
CREATE TABLE IF NOT EXISTS caption_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posting Schedule
CREATE TABLE IF NOT EXISTS story_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT true,
    posting_days VARCHAR[] DEFAULT ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday'],
    daily_post_limit INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posting Time Slots (each slot can have its own caption template)
CREATE TABLE IF NOT EXISTS posting_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_order INTEGER NOT NULL,
    posting_time TIME NOT NULL,
    caption_template_id UUID REFERENCES caption_templates(id) ON DELETE SET NULL,
    custom_caption TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story Images Queue
CREATE TABLE IF NOT EXISTS story_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url VARCHAR NOT NULL,
    processed_url VARCHAR,
    caption TEXT,
    caption_template_id UUID REFERENCES caption_templates(id) ON DELETE SET NULL,
    use_slot_caption BOOLEAN DEFAULT true,
    status VARCHAR DEFAULT 'pending',
    scheduled_date DATE,
    scheduled_time TIME,
    slot_id UUID REFERENCES posting_slots(id) ON DELETE SET NULL,
    posted_at TIMESTAMP WITH TIME ZONE,
    facebook_post_id VARCHAR,
    instagram_post_id VARCHAR,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE social_media_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE caption_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE posting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users for now)
CREATE POLICY "Allow all for social_media_settings" ON social_media_settings FOR ALL USING (true);
CREATE POLICY "Allow all for caption_templates" ON caption_templates FOR ALL USING (true);
CREATE POLICY "Allow all for story_schedule" ON story_schedule FOR ALL USING (true);
CREATE POLICY "Allow all for posting_slots" ON posting_slots FOR ALL USING (true);
CREATE POLICY "Allow all for story_images" ON story_images FOR ALL USING (true);

-- Create storage bucket for social media images (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('public', 'public', true);
