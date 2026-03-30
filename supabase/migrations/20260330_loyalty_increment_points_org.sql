-- increment_loyalty_points: set organization_id on INSERT (multi-tenant NOT NULL)
CREATE OR REPLACE FUNCTION increment_loyalty_points(
    p_customer_id UUID,
    p_points INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id FROM public.customers WHERE id = p_customer_id;
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Customer not found';
  END IF;

  UPDATE public.customer_loyalty
  SET
    total_points = total_points + p_points,
    updated_at = NOW()
  WHERE customer_id = p_customer_id;

  IF NOT FOUND THEN
    INSERT INTO public.customer_loyalty (
      organization_id,
      customer_id,
      total_points,
      redeemed_points,
      total_visits,
      last_reward_visit,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      p_customer_id,
      p_points,
      0,
      0,
      0,
      NOW(),
      NOW()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_loyalty_points(UUID, INTEGER) TO authenticated;
