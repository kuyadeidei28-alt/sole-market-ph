-- SOLE MARKET PH: Separate On-Hand and Pre-Order listing types.
-- Existing products are preserved and default to On-Hand.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS listing_type text NOT NULL DEFAULT 'on_hand',
  ADD COLUMN IF NOT EXISTS estimated_arrival date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_listing_type_check'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_listing_type_check
      CHECK (listing_type IN ('on_hand', 'pre_order'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS products_approved_listing_type_created_idx
  ON public.products (listing_type, created_at DESC)
  WHERE status = 'approved';
