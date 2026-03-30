-- Branch isolation hardening for multi-branch orgs
-- Non-owners are restricted to profiles.branch_id.
-- Owners remain org-wide.

-- =============================================================================
-- Appointments: SELECT/INSERT/UPDATE/DELETE
-- =============================================================================
DROP POLICY IF EXISTS "appointments_select_org" ON public.appointments;
CREATE POLICY "appointments_select_org"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role = 'Manager'
          AND me.branch_id = appointments.branch_id
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role = 'Receptionist'
          AND me.branch_id = appointments.branch_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.profile_id = auth.uid()
          AND s.id = appointments.stylist_id
          AND s.branch_id = appointments.branch_id
      )
    )
  );

DROP POLICY IF EXISTS "appointments_insert_org" ON public.appointments;
CREATE POLICY "appointments_insert_org"
  ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('Owner', 'Manager', 'Receptionist')
        AND (
          p2.role = 'Owner'
          OR p2.branch_id = appointments.branch_id
        )
    )
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND b.organization_id = appointments.organization_id
    )
  );

DROP POLICY IF EXISTS "appointments_update_org" ON public.appointments;
CREATE POLICY "appointments_update_org"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Owner', 'Manager', 'Receptionist')
          AND (
            me.role = 'Owner'
            OR me.branch_id = appointments.branch_id
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.profile_id = auth.uid()
          AND s.id = appointments.stylist_id
          AND s.branch_id = appointments.branch_id
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "appointments_delete_mgr" ON public.appointments;
CREATE POLICY "appointments_delete_mgr"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role = 'Manager'
          AND me.branch_id = appointments.branch_id
      )
    )
  );

-- =============================================================================
-- Invoices: SELECT/INSERT/UPDATE/DELETE (branch-bound for non-owners)
-- =============================================================================
DROP POLICY IF EXISTS "invoices_all_org" ON public.invoices;
CREATE POLICY "invoices_all_org"
  ON public.invoices FOR ALL TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Manager', 'Receptionist', 'Stylist')
          AND me.branch_id = invoices.branch_id
      )
    )
  )
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Manager', 'Receptionist', 'Stylist')
          AND me.branch_id = invoices.branch_id
      )
    )
  );

-- =============================================================================
-- Staff: SELECT (branch-bound for non-owners), INSERT/DELETE Owner-only
-- =============================================================================
DROP POLICY IF EXISTS "staff_select_org" ON public.staff;
CREATE POLICY "staff_select_org"
  ON public.staff FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR staff.branch_id = (SELECT p.branch_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "staff_insert_mgr" ON public.staff;
CREATE POLICY "staff_insert_owner"
  ON public.staff FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Owner'
    )
    AND EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = branch_id AND b.organization_id = public.staff.organization_id
    )
  );

DROP POLICY IF EXISTS "staff_delete_mgr" ON public.staff;
CREATE POLICY "staff_delete_owner"
  ON public.staff FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Owner'
    )
  );

DROP POLICY IF EXISTS "staff_update_mgr_or_self_emergency" ON public.staff;
CREATE POLICY "staff_update_mgr_or_self_emergency"
  ON public.staff FOR UPDATE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      -- Owner can update anything in org
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      -- Manager can update only same-branch staff
      OR (
        EXISTS (
          SELECT 1 FROM public.profiles me
          WHERE me.id = auth.uid()
            AND me.role = 'Manager'
            AND me.branch_id = staff.branch_id
        )
      )
      -- Staff can always update themselves (self-service / emergency unavailability)
      OR profile_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- =============================================================================
-- Petty cash: SELECT/INSERT/DELETE branch-bound for non-owners
-- =============================================================================
DROP POLICY IF EXISTS "petty_cash_select_org" ON public.petty_cash_transactions;
CREATE POLICY "petty_cash_select_org"
  ON public.petty_cash_transactions FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Manager', 'Receptionist')
          AND me.branch_id = petty_cash_transactions.branch_id
      )
    )
  );

DROP POLICY IF EXISTS "petty_cash_insert_org" ON public.petty_cash_transactions;
CREATE POLICY "petty_cash_insert_org"
  ON public.petty_cash_transactions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Manager', 'Receptionist')
          AND me.branch_id = branch_id
      )
    )
  );

DROP POLICY IF EXISTS "petty_cash_delete_mgr" ON public.petty_cash_transactions;
CREATE POLICY "petty_cash_delete_mgr"
  ON public.petty_cash_transactions FOR DELETE TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid() AND me.role = 'Owner'
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = auth.uid()
          AND me.role IN ('Manager', 'Receptionist')
          AND me.branch_id = petty_cash_transactions.branch_id
      )
    )
  );

