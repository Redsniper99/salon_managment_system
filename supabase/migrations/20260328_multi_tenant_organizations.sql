-- Multi-tenant: organizations (salons) + organization_id on tenant data
-- Safe to re-run: uses IF NOT EXISTS where supported

-- =============================================================================
-- 1) Organizations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations (is_active);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Default org for existing single-salon deployments (stable id for backfill)
INSERT INTO public.organizations (id, name, slug, is_active)
VALUES (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'Default Salon',
  'default',
  true
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2) Branches → organization
-- =============================================================================
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.branches
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.branches
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_branches_organization_id ON public.branches (organization_id);

-- =============================================================================
-- 3) Profiles & staff (staff.organization_id must exist before copying into profiles)
-- =============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.staff s
SET organization_id = b.organization_id
FROM public.branches b
WHERE s.branch_id = b.id AND s.organization_id IS NULL;

UPDATE public.staff
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.staff
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_organization_id ON public.staff (organization_id);

UPDATE public.profiles p
SET organization_id = s.organization_id
FROM public.staff s
WHERE s.profile_id = p.id AND p.organization_id IS NULL AND s.organization_id IS NOT NULL;

UPDATE public.profiles
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN organization_id SET DEFAULT 'a0000000-0000-4000-8000-000000000001'::uuid;

ALTER TABLE public.profiles
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles (organization_id);

-- =============================================================================
-- 4) Core business tables
-- =============================================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.appointments a
SET organization_id = b.organization_id
FROM public.branches b
WHERE a.branch_id = b.id AND a.organization_id IS NULL;

UPDATE public.appointments
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.appointments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments (organization_id);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.invoices i
SET organization_id = b.organization_id
FROM public.branches b
WHERE i.branch_id = b.id AND i.organization_id IS NULL;

UPDATE public.invoices
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.invoices
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices (organization_id);

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.customers
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.customers
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.services
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.services
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_organization_id ON public.services (organization_id);

ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.promo_codes
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.promo_codes
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_promo_codes_organization_id ON public.promo_codes (organization_id);

-- =============================================================================
-- 5) Petty cash, salon settings, campaigns
-- =============================================================================
ALTER TABLE public.petty_cash_transactions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.petty_cash_transactions p
SET organization_id = b.organization_id
FROM public.branches b
WHERE p.branch_id = b.id AND p.organization_id IS NULL;

UPDATE public.petty_cash_transactions
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.petty_cash_transactions
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_petty_cash_organization_id ON public.petty_cash_transactions (organization_id);

ALTER TABLE public.salon_settings
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.salon_settings
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

-- One settings row per organization (dedupe if multiple rows map to same org)
DELETE FROM public.salon_settings a
  USING public.salon_settings b
WHERE a.organization_id IS NOT DISTINCT FROM b.organization_id
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_salon_settings_organization_id
  ON public.salon_settings (organization_id);

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.campaigns
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.campaigns
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns (organization_id);

ALTER TABLE public.campaign_sends
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.campaign_sends cs
SET organization_id = c.organization_id
FROM public.campaigns c
WHERE cs.campaign_id = c.id AND cs.organization_id IS NULL;

UPDATE public.campaign_sends
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.campaign_sends
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_sends_organization_id ON public.campaign_sends (organization_id);

ALTER TABLE public.customer_segments
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

UPDATE public.customer_segments
SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
WHERE organization_id IS NULL;

ALTER TABLE public.customer_segments
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_customer_segments_organization_id ON public.customer_segments (organization_id);

-- =============================================================================
-- 6) In-app notifications (if present)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'in_app_notifications') THEN
    ALTER TABLE public.in_app_notifications ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

    UPDATE public.in_app_notifications n
    SET organization_id = b.organization_id
    FROM public.branches b
    WHERE n.branch_id = b.id AND n.organization_id IS NULL;

    UPDATE public.in_app_notifications
    SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
    WHERE organization_id IS NULL;

    ALTER TABLE public.in_app_notifications ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_in_app_notifications_organization_id ON public.in_app_notifications (organization_id);
  END IF;
END $$;

-- =============================================================================
-- 7) Inventory (if present)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') THEN
    ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.inventory SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid WHERE organization_id IS NULL;
    ALTER TABLE public.inventory ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON public.inventory (organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory_transactions') THEN
    ALTER TABLE public.inventory_transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.inventory_transactions it
    SET organization_id = i.organization_id
    FROM public.inventory i
    WHERE it.inventory_id = i.id AND it.organization_id IS NULL;
    UPDATE public.inventory_transactions
    SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid
    WHERE organization_id IS NULL;
    ALTER TABLE public.inventory_transactions ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_inventory_transactions_organization_id ON public.inventory_transactions (organization_id);
  END IF;
END $$;

-- =============================================================================
-- 8) Loyalty tables (if present)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_cards') THEN
    ALTER TABLE public.loyalty_cards ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.loyalty_cards SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid WHERE organization_id IS NULL;
    ALTER TABLE public.loyalty_cards ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_loyalty_cards_organization_id ON public.loyalty_cards (organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_loyalty') THEN
    ALTER TABLE public.customer_loyalty ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.customer_loyalty cl
    SET organization_id = c.organization_id
    FROM public.customers c
    WHERE cl.customer_id = c.id AND cl.organization_id IS NULL;
    UPDATE public.customer_loyalty SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid WHERE organization_id IS NULL;
    ALTER TABLE public.customer_loyalty ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_customer_loyalty_organization_id ON public.customer_loyalty (organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_settings') THEN
    ALTER TABLE public.loyalty_settings ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.loyalty_settings SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid WHERE organization_id IS NULL;
    DELETE FROM public.loyalty_settings a
      USING public.loyalty_settings b
    WHERE a.organization_id IS NOT DISTINCT FROM b.organization_id
      AND a.id::text > b.id::text;
    ALTER TABLE public.loyalty_settings ALTER COLUMN organization_id SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS uq_loyalty_settings_organization_id ON public.loyalty_settings (organization_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'loyalty_transactions') THEN
    ALTER TABLE public.loyalty_transactions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);
    UPDATE public.loyalty_transactions lt
    SET organization_id = c.organization_id
    FROM public.customers c
    WHERE lt.customer_id = c.id AND lt.organization_id IS NULL;
    UPDATE public.loyalty_transactions SET organization_id = 'a0000000-0000-4000-8000-000000000001'::uuid WHERE organization_id IS NULL;
    ALTER TABLE public.loyalty_transactions ALTER COLUMN organization_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_organization_id ON public.loyalty_transactions (organization_id);
  END IF;
END $$;

-- =============================================================================
-- 9) Triggers: keep organization_id aligned with branch_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_organization_id_from_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    SELECT b.organization_id INTO NEW.organization_id
    FROM public.branches b
    WHERE b.id = NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_sync_org ON public.appointments;
CREATE TRIGGER trg_appointments_sync_org
  BEFORE INSERT OR UPDATE OF branch_id ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_id_from_branch();

DROP TRIGGER IF EXISTS trg_invoices_sync_org ON public.invoices;
CREATE TRIGGER trg_invoices_sync_org
  BEFORE INSERT OR UPDATE OF branch_id ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_id_from_branch();

DROP TRIGGER IF EXISTS trg_petty_cash_sync_org ON public.petty_cash_transactions;
CREATE TRIGGER trg_petty_cash_sync_org
  BEFORE INSERT OR UPDATE OF branch_id ON public.petty_cash_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_organization_id_from_branch();

CREATE OR REPLACE FUNCTION public.sync_staff_organization_from_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    SELECT b.organization_id INTO NEW.organization_id
    FROM public.branches b
    WHERE b.id = NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_sync_org ON public.staff;
CREATE TRIGGER trg_staff_sync_org
  BEFORE INSERT OR UPDATE OF branch_id ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_organization_from_branch();

COMMENT ON TABLE public.organizations IS 'Salon tenant (multi-salon SaaS boundary)';
COMMENT ON COLUMN public.branches.organization_id IS 'Parent salon / organization';
