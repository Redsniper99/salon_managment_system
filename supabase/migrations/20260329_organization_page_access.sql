-- Owner-configurable page visibility per organization/role

CREATE TABLE IF NOT EXISTS public.organization_page_access (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('Owner', 'Manager', 'Receptionist', 'Stylist')),
  page_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organization_page_access_pk PRIMARY KEY (organization_id, role, page_key)
);

ALTER TABLE public.organization_page_access ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users can read their own org's access matrix
DROP POLICY IF EXISTS "page_access_select_org" ON public.organization_page_access;
CREATE POLICY "page_access_select_org"
  ON public.organization_page_access FOR SELECT TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Write: only Owner can manage page access for their org
DROP POLICY IF EXISTS "page_access_owner_upsert" ON public.organization_page_access;
CREATE POLICY "page_access_owner_upsert"
  ON public.organization_page_access FOR ALL TO authenticated
  USING (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Owner'
    )
  )
  WITH CHECK (
    organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'Owner'
    )
  );

