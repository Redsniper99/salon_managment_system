-- In-app notifications schema (DB-backed, per-staff read/unread)
-- Created to replace hardcoded notifications UI with real user notifications.

-- ============================================
-- 1) Core notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  appointment_id UUID REFERENCES appointments(id),
  invoice_id UUID REFERENCES invoices(id),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_branch_id
  ON in_app_notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at
  ON in_app_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_type
  ON in_app_notifications(type);

-- ============================================
-- 2) Recipient table (read/unread per staff)
-- ============================================
CREATE TABLE IF NOT EXISTS in_app_notification_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES in_app_notifications(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_in_app_notification_recipients_staff_read
  ON in_app_notification_recipients(staff_id, is_read);
CREATE INDEX IF NOT EXISTS idx_in_app_notification_recipients_notification
  ON in_app_notification_recipients(notification_id);

-- ============================================
-- 3) Row Level Security (RLS)
-- ============================================
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Staff can view only their own recipient rows
CREATE POLICY IF NOT EXISTS "Staff can view own in-app notifications"
  ON in_app_notification_recipients
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id
      FROM staff s
      WHERE s.profile_id = auth.uid()
    )
  );

-- Staff can mark as read only their own recipient rows
CREATE POLICY IF NOT EXISTS "Staff can mark own notifications as read"
  ON in_app_notification_recipients
  FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT s.id
      FROM staff s
      WHERE s.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    staff_id IN (
      SELECT s.id
      FROM staff s
      WHERE s.profile_id = auth.uid()
    )
  );

-- In-app notifications itself is not directly selectable by staff.
-- Instead, UI/API should select notifications via join to recipient rows.
CREATE POLICY IF NOT EXISTS "No direct select on in_app_notifications"
  ON in_app_notifications
  FOR SELECT
  TO authenticated
  USING (false);

