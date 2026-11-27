-- SOLE MARKET PH: Admin product moderation RPCs.
-- Browser clients cannot directly change product approval status.
-- These functions are callable only by authenticated admins.

CREATE OR REPLACE FUNCTION public.admin_list_pending_products()
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  title text,
  brand text,
  category text,
  size text,
  price numeric,
  description text,
  messenger_url text,
  seller_name text,
  image_url text,
  status text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.seller_id, p.title, p.brand, p.category, p.size,
    p.price, p.description, p.messenger_url, p.seller_name,
    p.image_url, p.status, p.created_at
  FROM public.products p
  WHERE p.status = 'pending'
  ORDER BY p.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.products
  SET status = 'approved'
  WHERE id = p_product_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending product not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.products
  SET status = 'rejected'
  WHERE id = p_product_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending product not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_pending_products() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_approve_product(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_product(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_list_pending_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_product(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_product(uuid) TO authenticated;
