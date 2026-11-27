-- SOLE MARKET PH: Seller profiles, public directory, and subscription expiry hardening
-- Apply this migration in Supabase SQL Editor after reviewing it.
-- Safe to re-run: columns/function grants are idempotent.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS messenger_url text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_location_length_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_location_length_check
  CHECK (location IS NULL OR char_length(location) <= 120);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_length_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length_check
  CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_messenger_url_length_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_messenger_url_length_check
  CHECK (messenger_url IS NULL OR char_length(messenger_url) <= 500);

CREATE OR REPLACE FUNCTION public.public_seller_directory()
RETURNS TABLE (
  seller_id uuid,
  display_name text,
  location text,
  bio text,
  messenger_url text,
  product_count bigint,
  latest_listing timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.display_name,
    p.location,
    p.bio,
    COALESCE(
      NULLIF(p.messenger_url, ''),
      (array_agg(NULLIF(pr.messenger_url, '') ORDER BY pr.created_at DESC)
        FILTER (WHERE NULLIF(pr.messenger_url, '') IS NOT NULL))[1]
    ),
    COUNT(pr.id),
    MAX(pr.created_at)
  FROM public.profiles p
  JOIN public.products pr ON pr.seller_id = p.id
  WHERE pr.status = 'approved'
  GROUP BY p.id, p.display_name, p.location, p.bio, p.messenger_url
  ORDER BY MAX(pr.created_at) DESC;
$$;

REVOKE ALL ON FUNCTION public.public_seller_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_seller_directory() TO anon, authenticated;

-- The expiry function changes subscription records. Do not expose it to browser clients.
REVOKE ALL ON FUNCTION public.expire_sole_market_subscriptions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_sole_market_subscriptions() FROM anon;
REVOKE ALL ON FUNCTION public.expire_sole_market_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_sole_market_subscriptions() TO service_role;

COMMENT ON FUNCTION public.expire_sole_market_subscriptions() IS
'Service-role/server-only task. Schedule a daily call using Supabase Cron or a trusted server scheduler; never expose this function to browser clients.';

-- Scheduling is intentionally not automatic here because the existing project
-- scheduler configuration has not yet been verified.
