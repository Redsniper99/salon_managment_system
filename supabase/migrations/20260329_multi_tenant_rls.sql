-- Multi-tenant RLS: scope by profiles.organization_id; branch-bound roles for appointments/invoices

-- =============================================================================
-- Helpers (inline in policies; no SECURITY DEFINER functions)
-- =============================================================================

-- =============================================================================
-- Drop existing policies (by table) and recreate
-- =============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'organizations', 'branches', 'customers', 'services', 'staff',
        'appointments', 'invoices', 'promo_codes', 'petty_cash_transactions',
        'salon_settings', 'stylist_breaks', 'campaigns', 'campaign_sends',
        'customer_segments', 'in_app_notifications', 'in_app_notification_recipients'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Inventory (optional tables)
DO $$
DECLARE r record;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory', r.policyname);
    END LOOP;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inventory_transactions'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_transactions', r.policyname);
    END LOOP;
  END IF;
END $$;

-- Loyalty (optional)
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['loyalty_cards','customer_loyalty','loyalty_settings','loyalty_transactions']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations: see own tenant only; Owners may insert new org (onboarding); update own org
CREATE POLICY "org_select_member"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "org_update_owner_same"
  ON public.organizations FOR UPDATE TO authenticated
  USING (
    id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  );

-- Branches
CREATE POLICY "branches_select_org"
  ON public.branches FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "branches_insert_mgr"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

CREATE POLICY "branches_update_mgr"
  ON public.branches FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

CREATE POLICY "branches_delete_owner"
  ON public.branches FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Owner'
    )
  );

-- Profiles: keep self read; allow org managers to read profiles in same org (staff management)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "profiles_insert_self"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_select_self_or_mgr"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
        AND me.role IN ('Owner', 'Manager')
        AND me.organization_id = profiles.organization_id
      )
    )
  );

CREATE POLICY "profiles_update_self"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Customers
CREATE POLICY "customers_all_org"
  ON public.customers FOR ALL TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Services (SELECT for all org staff; write for Owner/Manager only)
CREATE POLICY "services_select_org"
  ON public.services FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "services_insert_mgr"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

CREATE POLICY "services_update_mgr"
  ON public.services FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "services_delete_mgr"
  ON public.services FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

-- Staff
CREATE POLICY "staff_select_org"
  ON public.staff FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "staff_insert_mgr"
  ON public.staff FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

CREATE POLICY "staff_update_mgr_or_self_emergency"
  ON public.staff FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
      OR profile_id = auth.uid()
    )
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "staff_delete_mgr"
  ON public.staff FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

-- Appointments
CREATE POLICY "appointments_select_org"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
      OR EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Receptionist' AND p2.branch_id = appointments.branch_id)
      OR EXISTS (
        SELECT 1 FROM public.staff s
        WHERE s.profile_id = auth.uid() AND s.id = appointments.stylist_id
      )
    )
  );

CREATE POLICY "appointments_insert_org"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid()
      AND p2.role IN ('Owner', 'Manager', 'Receptionist')
    )
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND b.organization_id = appointments.organization_id
    )
  );

CREATE POLICY "appointments_update_org"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager', 'Receptionist'))
      OR EXISTS (
        SELECT 1 FROM public.staff s
        WHERE s.profile_id = auth.uid() AND s.id = appointments.stylist_id
      )
    )
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "appointments_delete_mgr"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
    )
  );

-- Invoices
CREATE POLICY "invoices_all_org"
  ON public.invoices FOR ALL TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND b.organization_id = invoices.organization_id
    )
  );

-- Promo codes
CREATE POLICY "promo_select_org"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      is_active = true
      OR EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
      )
    )
  );

CREATE POLICY "promo_insert_mgr"
  ON public.promo_codes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

CREATE POLICY "promo_update_mgr"
  ON public.promo_codes FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "promo_delete_mgr"
  ON public.promo_codes FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

-- Petty cash
CREATE POLICY "petty_cash_select_org"
  ON public.petty_cash_transactions FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "petty_cash_insert_org"
  ON public.petty_cash_transactions FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "petty_cash_delete_mgr"
  ON public.petty_cash_transactions FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

-- Salon settings (per org)
CREATE POLICY "salon_settings_select_org"
  ON public.salon_settings FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "salon_settings_insert_owner"
  ON public.salon_settings FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  );

CREATE POLICY "salon_settings_update_owner"
  ON public.salon_settings FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "salon_settings_delete_owner"
  ON public.salon_settings FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  );

-- Stylist breaks: via stylist belonging to org
CREATE POLICY "stylist_breaks_select_org"
  ON public.stylist_breaks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = stylist_breaks.stylist_id
      AND s.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "stylist_breaks_mutate_own_or_owner"
  ON public.stylist_breaks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = stylist_breaks.stylist_id
      AND s.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
      AND (
        s.profile_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p2
          WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager')
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = stylist_breaks.stylist_id
      AND s.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- Campaigns
CREATE POLICY "campaigns_select_org"
  ON public.campaigns FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "campaigns_insert_mgr"
  ON public.campaigns FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

CREATE POLICY "campaigns_update_mgr"
  ON public.campaigns FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "campaigns_delete_mgr"
  ON public.campaigns FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

CREATE POLICY "campaign_sends_select_org"
  ON public.campaign_sends FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "campaign_sends_insert_mgr"
  ON public.campaign_sends FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

CREATE POLICY "campaign_sends_update_mgr"
  ON public.campaign_sends FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "campaign_sends_delete_mgr"
  ON public.campaign_sends FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role IN ('Owner', 'Manager'))
  );

-- Customer segments
CREATE POLICY "segments_select_org"
  ON public.customer_segments FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "segments_insert_owner"
  ON public.customer_segments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  );

CREATE POLICY "segments_update_owner"
  ON public.customer_segments FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  )
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "segments_delete_owner"
  ON public.customer_segments FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
  );

-- In-app notifications
CREATE POLICY "in_app_notifications_select_org"
  ON public.in_app_notifications FOR SELECT TO authenticated
  USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "in_app_notifications_insert_org"
  ON public.in_app_notifications FOR INSERT TO authenticated
  WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));

-- Recipients: staff in same org
CREATE POLICY "in_app_recipients_select_own"
  ON public.in_app_notification_recipients FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_id
      AND s.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

CREATE POLICY "in_app_recipients_update_own"
  ON public.in_app_notification_recipients FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_id AND s.profile_id = auth.uid()
    )
  );

CREATE POLICY "in_app_recipients_insert_org"
  ON public.in_app_notification_recipients FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_id
      AND s.organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- =============================================================================
-- Inventory RLS (if tables exist)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    CREATE POLICY "inventory_all_org"
      ON public.inventory FOR ALL TO authenticated
      USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN
    CREATE POLICY "inventory_tx_all_org"
      ON public.inventory_transactions FOR ALL TO authenticated
      USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
  END IF;
END $$;

-- =============================================================================
-- Loyalty RLS
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_cards') THEN
    CREATE POLICY "loyalty_cards_org"
      ON public.loyalty_cards FOR ALL TO authenticated
      USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_loyalty') THEN
    CREATE POLICY "customer_loyalty_org"
      ON public.customer_loyalty FOR ALL TO authenticated
      USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_settings') THEN
    CREATE POLICY "loyalty_settings_select_org"
      ON public.loyalty_settings FOR SELECT TO authenticated
      USING (
        organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
      );
    CREATE POLICY "loyalty_settings_insert_owner"
      ON public.loyalty_settings FOR INSERT TO authenticated
      WITH CHECK (
        organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
      );
    CREATE POLICY "loyalty_settings_update_owner"
      ON public.loyalty_settings FOR UPDATE TO authenticated
      USING (
        organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
      )
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
    CREATE POLICY "loyalty_settings_delete_owner"
      ON public.loyalty_settings FOR DELETE TO authenticated
      USING (
        organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.role = 'Owner')
      );
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_transactions') THEN
    CREATE POLICY "loyalty_transactions_org"
      ON public.loyalty_transactions FOR ALL TO authenticated
      USING (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()))
      WITH CHECK (organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid()));
  END IF;
END $$;
