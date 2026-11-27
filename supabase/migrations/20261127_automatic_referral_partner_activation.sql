-- SOLE MARKET PH: Automatically activate valid invitees as referral partners.
-- Organic signups remain ordinary sellers. Only valid referral invitations activate partner access.
-- Direct-referral commission attribution remains unchanged (no multi-level commissions).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code text;
  v_referrer_id uuid;
  v_invite_id uuid;
  v_new_code text;
  v_initial_partner boolean := false;
BEGIN
  v_code := upper(trim(coalesce(
    new.raw_user_meta_data ->> 'referral_code',
    ''
  )));

  IF v_code <> '' THEN
    -- The initial admin-issued invitation is single-use.
    SELECT id
      INTO v_invite_id
    FROM public.referral_invites
    WHERE upper(token) = v_code
      AND claimed_at IS NULL
    FOR UPDATE;

    IF FOUND THEN
      v_initial_partner := true;

      UPDATE public.referral_invites
      SET claimed_by = new.id,
          claimed_at = now()
      WHERE id = v_invite_id;
    ELSE
      -- Existing referral partners may invite multiple direct referrals.
      SELECT id
        INTO v_referrer_id
      FROM public.profiles
      WHERE upper(referral_code) = v_code
        AND is_referral_partner = true
      LIMIT 1;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or already-used invitation link';
      END IF;

      IF v_referrer_id = new.id THEN
        RAISE EXCEPTION 'You cannot use your own referral link';
      END IF;
    END IF;
  END IF;

  -- Preserve the existing profile creation behavior and direct referrer.
  INSERT INTO public.profiles (
    id,
    display_name,
    referred_by
  )
  VALUES (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    v_referrer_id
  )
  ON CONFLICT (id) DO NOTHING;

  -- Every valid invitee becomes a referral partner and receives their own code.
  -- This applies to the first admin-invited partner and subsequent partner invitees.
  IF v_initial_partner OR v_referrer_id IS NOT NULL THEN
    LOOP
      v_new_code := 'SM' ||
        upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

      EXIT WHEN NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE upper(referral_code) = v_new_code
      );
    END LOOP;

    UPDATE public.profiles
    SET is_referral_partner = true,
        referral_code = coalesce(referral_code, v_new_code),
        commission_rate = coalesce(commission_rate, 20)
    WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
