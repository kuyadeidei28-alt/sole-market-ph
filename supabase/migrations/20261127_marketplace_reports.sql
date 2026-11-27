-- SOLE MARKET PH: buyer reports and admin moderation
CREATE TABLE IF NOT EXISTS public.marketplace_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
 seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK (reason IN ('counterfeit','scam','misleading_listing','fake_photos','wrong_details','suspicious_activity','harassment','other')),
 details text NOT NULL CHECK (char_length(trim(details)) BETWEEN 10 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
 admin_notes text,
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (product_id IS NOT NULL OR seller_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS marketplace_reports_status_created_idx ON public.marketplace_reports(status,created_at DESC);
ALTER TABLE public.marketplace_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit reports" ON public.marketplace_reports;
CREATE POLICY "Users can submit reports" ON public.marketplace_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id AND status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
DROP POLICY IF EXISTS "Users can view own reports" ON public.marketplace_reports;
CREATE POLICY "Users can view own reports" ON public.marketplace_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.is_sole_market_admin());
DROP POLICY IF EXISTS "Admins can update reports" ON public.marketplace_reports;
CREATE POLICY "Admins can update reports" ON public.marketplace_reports FOR UPDATE TO authenticated
USING (public.is_sole_market_admin()) WITH CHECK (public.is_sole_market_admin());

CREATE OR REPLACE FUNCTION public.admin_list_marketplace_reports()
RETURNS TABLE(id uuid,reporter_id uuid,product_id uuid,seller_id uuid,reason text,details text,status text,admin_notes text,created_at timestamptz,product_title text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
 RETURN QUERY SELECT r.id,r.reporter_id,r.product_id,r.seller_id,r.reason,r.details,r.status,r.admin_notes,r.created_at,p.title
 FROM public.marketplace_reports r LEFT JOIN public.products p ON p.id=r.product_id
 ORDER BY CASE WHEN r.status='pending' THEN 0 WHEN r.status='reviewing' THEN 1 ELSE 2 END,r.created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_marketplace_reports() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_marketplace_reports() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_marketplace_report(p_report_id uuid,p_status text,p_notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_sole_market_admin() THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF p_status NOT IN ('reviewing','resolved','dismissed') THEN RAISE EXCEPTION 'Invalid report status'; END IF;
 UPDATE public.marketplace_reports SET status=p_status,admin_notes=NULLIF(trim(p_notes),''),reviewed_by=auth.uid(),reviewed_at=now()
 WHERE id=p_report_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_marketplace_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_update_marketplace_report(uuid,text,text) TO authenticated;
