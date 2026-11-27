-- SOLE MARKET PH: mandatory seller identity and business verification
CREATE TABLE IF NOT EXISTS public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_type text NOT NULL CHECK (seller_type IN ('personal','business')),
  legal_name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  address text NOT NULL,
  facebook_url text,
  business_name text,
  registration_type text CHECK (registration_type IN ('DTI','SEC','CDA','OTHER')),
  id_document_path text NOT NULL,
  business_document_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','suspended')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  id_document_hash text,
  business_document_hash text,
  automatic_check_status text NOT NULL DEFAULT 'needs_review' CHECK (automatic_check_status IN ('passed','needs_review','failed')),
  automatic_check_notes text,
  CONSTRAINT business_document_required CHECK (
    (seller_type = 'personal' AND business_document_path IS NULL)
    OR
    (seller_type = 'business' AND business_document_path IS NOT NULL AND business_name IS NOT NULL AND registration_type IS NOT NULL)
  )
);

ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS id_document_hash text;
ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS business_document_hash text;
ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS automatic_check_status text NOT NULL DEFAULT 'needs_review';
ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS automatic_check_notes text;

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers can view own verification status" ON public.seller_verifications;
CREATE POLICY "Sellers can view own verification status"
ON public.seller_verifications FOR SELECT TO authenticated
USING (auth.uid() = seller_id OR public.is_sole_market_admin());

DROP POLICY IF EXISTS "Sellers can submit own verification" ON public.seller_verifications;
CREATE POLICY "Sellers can submit own verification"
ON public.seller_verifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id AND status = 'pending');

DROP POLICY IF EXISTS "Sellers can update own rejected verification" ON public.seller_verifications;
CREATE POLICY "Sellers can update own rejected verification"
ON public.seller_verifications FOR UPDATE TO authenticated
USING (auth.uid() = seller_id AND status = 'rejected')
WITH CHECK (auth.uid() = seller_id AND status = 'pending');

DROP POLICY IF EXISTS "Admins can review seller verification" ON public.seller_verifications;
CREATE POLICY "Admins can review seller verification"
ON public.seller_verifications FOR UPDATE TO authenticated
USING (public.is_sole_market_admin())
WITH CHECK (public.is_sole_market_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('seller-verification-docs','seller-verification-docs',false,5242880,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf'];

DROP POLICY IF EXISTS "Sellers upload own verification documents" ON storage.objects;
CREATE POLICY "Sellers upload own verification documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'seller-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Admins view seller verification documents" ON storage.objects;
CREATE POLICY "Admins view seller verification documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'seller-verification-docs' AND public.is_sole_market_admin());

DROP POLICY IF EXISTS "Sellers replace own verification documents" ON storage.objects;
CREATE POLICY "Sellers replace own verification documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'seller-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'seller-verification-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP FUNCTION IF EXISTS public.admin_list_seller_verifications();
CREATE OR REPLACE FUNCTION public.admin_list_seller_verifications()
RETURNS TABLE (
 id uuid, seller_id uuid, seller_type text, legal_name text, phone text,
 email text, address text, facebook_url text, business_name text,
 registration_type text, id_document_path text, business_document_path text,
 status text, rejection_reason text, created_at timestamptz,
 automatic_check_status text, automatic_check_notes text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 RETURN QUERY SELECT v.id,v.seller_id,v.seller_type,v.legal_name,v.phone,v.email,
   v.address,v.facebook_url,v.business_name,v.registration_type,
   v.id_document_path,v.business_document_path,v.status,v.rejection_reason,v.created_at,
   v.automatic_check_status,v.automatic_check_notes
 FROM public.seller_verifications v
 ORDER BY CASE WHEN v.status='pending' THEN 0 ELSE 1 END, v.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_seller_verifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_seller_verifications() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_review_seller_verification(
 p_verification_id uuid, p_approve boolean, p_reason text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN
   RAISE EXCEPTION 'Not authorized';
 END IF;
 UPDATE public.seller_verifications
 SET status = CASE WHEN p_approve THEN 'verified' ELSE 'rejected' END,
     rejection_reason = CASE WHEN p_approve THEN NULL ELSE NULLIF(trim(p_reason),'') END,
     reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now()
 WHERE id = p_verification_id AND status IN ('pending','rejected');
 IF NOT FOUND THEN RAISE EXCEPTION 'Verification request not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_seller_verification(uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_seller_verification(uuid,boolean,text) TO authenticated;

-- Automatic duplicate-file checking. Hashes are calculated in the browser; raw documents remain private.
CREATE INDEX IF NOT EXISTS seller_verifications_id_document_hash_idx
ON public.seller_verifications (id_document_hash)
WHERE id_document_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS seller_verifications_business_document_hash_idx
ON public.seller_verifications (business_document_hash)
WHERE business_document_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_seller_verification_duplicates(
 p_id_document_hash text,
 p_business_document_hash text DEFAULT NULL
)
RETURNS TABLE (duplicate_id_document boolean, duplicate_business_document boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_user_id uuid := auth.uid();
BEGIN
 IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_id_document_hash IS NULL OR length(p_id_document_hash) <> 64 THEN
   RAISE EXCEPTION 'Invalid ID document fingerprint';
 END IF;
 RETURN QUERY SELECT
   EXISTS (SELECT 1 FROM public.seller_verifications v
           WHERE v.seller_id <> v_user_id AND v.id_document_hash = p_id_document_hash),
   CASE WHEN p_business_document_hash IS NULL THEN false ELSE
     EXISTS (SELECT 1 FROM public.seller_verifications v
             WHERE v.seller_id <> v_user_id AND v.business_document_hash = p_business_document_hash)
   END;
END;
$$;
REVOKE ALL ON FUNCTION public.check_seller_verification_duplicates(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_seller_verification_duplicates(text,text) TO authenticated;

-- Preserve the marketplace's existing permissive subscription/eligibility policy.
-- This additional RESTRICTIVE policy ANDs with it, so BOTH checks must pass.
DROP POLICY IF EXISTS "Verified sellers can insert their own products" ON public.products;
DROP POLICY IF EXISTS "Verified sellers require verification" ON public.products;
CREATE POLICY "Verified sellers require verification"
ON public.products AS RESTRICTIVE
FOR INSERT TO authenticated
WITH CHECK (
 auth.uid() = seller_id
 AND EXISTS (
   SELECT 1 FROM public.seller_verifications v
   WHERE v.seller_id = auth.uid() AND v.status = 'verified'
 )
);
