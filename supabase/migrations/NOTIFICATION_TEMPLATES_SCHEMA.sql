-- Step 1: Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS notification_templates CASCADE;

-- Step 2: Create the table with proper constraints
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'both')),
    subject TEXT,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add unique constraint on type
ALTER TABLE notification_templates ADD CONSTRAINT unique_template_type UNIQUE (type);

-- Step 4: Enable RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies
CREATE POLICY "Everyone can view active templates"
    ON notification_templates FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Owners and Managers can manage templates"
    ON notification_templates FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('Owner', 'Manager')
        )
    );

-- Step 6: Insert default templates (no ON CONFLICT needed since table is fresh)
INSERT INTO notification_templates (name, type, channel, subject, message, is_active)
VALUES
    (
        'Appointment Confirmation',
        'appointment_confirmation',
        'both',
        'Appointment Confirmed - {customer_name}',
        'Hi {customer_name},

Your appointment has been confirmed!

Date: {date}
Time: {time}
Service: {service}
Stylist: {stylist}

We look forward to seeing you!

Best regards,
SalonFlow Team',
        true
    ),
    (
        'Appointment Reminder',
        'appointment_reminder',
        'both',
        'Reminder: Your Appointment Tomorrow',
        'Hi {customer_name},

This is a friendly reminder about your appointment tomorrow:

Date: {date}
Time: {time}
Service: {service}
Stylist: {stylist}

See you soon!

Best regards,
SalonFlow Team',
        true
    ),
    (
        'Appointment Cancellation',
        'appointment_cancellation',
        'both',
        'Appointment Cancelled',
        'Hi {customer_name},

Your appointment has been cancelled:

Date: {date}
Time: {time}

If you would like to reschedule, please contact us.

Best regards,
SalonFlow Team',
        true
    ),
    (
        'Promotional Campaign',
        'promotional',
        'both',
        'Special Offer Just for You!',
        'Hi {customer_name},

We have a special offer just for you!

Don''t miss out on this exclusive deal.

Visit us soon!

Best regards,
SalonFlow Team',
        true
    );

-- Step 7: Create indexes for faster lookups
CREATE INDEX idx_notification_templates_type ON notification_templates(type);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);
