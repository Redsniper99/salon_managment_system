-- Fix stylists/staff whose profiles.organization_id was left as the DB default
-- instead of their branch's organization (breaks RLS and branch loading after login).

UPDATE public.profiles p
SET organization_id = b.organization_id
FROM public.branches b
WHERE p.branch_id = b.id
  AND p.branch_id IS NOT NULL
  AND p.organization_id IS DISTINCT FROM b.organization_id;

-- Keep staff.organization_id aligned (trigger usually handles new rows; this fixes legacy rows).
UPDATE public.staff s
SET organization_id = b.organization_id
FROM public.branches b
WHERE s.branch_id = b.id
  AND s.organization_id IS DISTINCT FROM b.organization_id;
