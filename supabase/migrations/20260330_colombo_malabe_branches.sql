-- Replace legacy "Main" branch naming with Colombo + Malabe (Sri Lanka locations).

-- 1) Rename common default branch names to Colombo
UPDATE public.branches
SET
  name = 'Colombo',
  address = CASE
    WHEN name IN ('Main Branch', 'Main Salon') THEN 'No. 12, Galle Road, Colombo 03'
    ELSE address
  END,
  phone = CASE
    WHEN name IN ('Main Branch', 'Main Salon') THEN '+94 11 234 5678'
    ELSE phone
  END
WHERE name IN ('Main Branch', 'Main Salon');

-- 2) Add Malabe if missing (copy organization from Colombo or default org)
DO $$
DECLARE
  v_org uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.branches WHERE name = 'Malabe') THEN
    RETURN;
  END IF;

  SELECT organization_id INTO v_org FROM public.branches WHERE name = 'Colombo' LIMIT 1;

  IF v_org IS NULL AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN
    SELECT id INTO v_org FROM public.organizations WHERE slug = 'default' LIMIT 1;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'branches' AND column_name = 'organization_id'
  ) THEN
    IF v_org IS NULL THEN
      RETURN;
    END IF;
    INSERT INTO public.branches (name, address, phone, organization_id)
    VALUES ('Malabe', '45 Kaduwela Road, Malabe', '+94 11 555 0100', v_org);
  ELSE
    INSERT INTO public.branches (name, address, phone)
    VALUES ('Malabe', '45 Kaduwela Road, Malabe', '+94 11 555 0100');
  END IF;
END $$;
