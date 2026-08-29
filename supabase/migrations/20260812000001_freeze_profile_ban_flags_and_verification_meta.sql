-- Freeze account-status columns on client UPDATE (prevent self-unban / self-reactivate).
-- Privilege source remains profiles; service_role (admin ban API) bypasses RLS.
-- Safe to re-run. Requires public.profiles (created by ops/20260812000000_bootstrap_profiles_for_ban_freeze.sql).

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active IS NOT DISTINCT FROM (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    AND is_deleted IS NOT DISTINCT FROM (SELECT p.is_deleted FROM public.profiles p WHERE p.id = auth.uid())
    AND deleted_at IS NOT DISTINCT FROM (SELECT p.deleted_at FROM public.profiles p WHERE p.id = auth.uid())
    AND COALESCE(status, '') IS NOT DISTINCT FROM COALESCE(
      (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    )
  );

-- Keep strip function aligned with verificationStatus allowlist
CREATE OR REPLACE FUNCTION public.strip_privileged_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned jsonb;
  k text;
  allowed text[] := ARRAY['fullName', 'phone', 'avatar_url', 'familyName', 'governorate', 'lawyerBarRoom', 'verificationStatus'];
  safe_meta jsonb := '{}'::jsonb;
  acct text;
  vstatus text;
BEGIN
  cleaned := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  FOREACH k IN ARRAY allowed LOOP
    IF cleaned ? k THEN
      safe_meta := safe_meta || jsonb_build_object(k, cleaned -> k);
    END IF;
  END LOOP;

  acct := lower(trim(both from COALESCE(cleaned ->> 'accountType', 'lawyer')));
  IF acct IN ('lawyer', 'client') THEN
    safe_meta := safe_meta || jsonb_build_object('accountType', acct);
  ELSE
    safe_meta := safe_meta || jsonb_build_object('accountType', 'lawyer');
  END IF;

  vstatus := lower(trim(both from COALESCE(cleaned ->> 'verificationStatus', '')));
  IF vstatus IN ('pending', 'active', 'rejected') THEN
    safe_meta := safe_meta || jsonb_build_object('verificationStatus', vstatus);
  END IF;

  NEW.raw_user_meta_data := safe_meta;
  RETURN NEW;
END;
$$;
