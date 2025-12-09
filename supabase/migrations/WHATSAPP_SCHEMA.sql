-- Add 'whatsapp' to the allowed channels
ALTER TABLE notification_templates
DROP CONSTRAINT IF EXISTS notification_templates_channel_check;

ALTER TABLE notification_templates
ADD CONSTRAINT notification_templates_channel_check 
CHECK (channel IN ('sms', 'email', 'whatsapp', 'both'));

-- Add column for WhatsApp template name (required by Meta)
ALTER TABLE notification_templates
ADD COLUMN IF NOT EXISTS whatsapp_template_name text;

-- Comment on column
COMMENT ON COLUMN notification_templates.whatsapp_template_name IS 'The exact template name as defined in Meta WhatsApp Manager';
