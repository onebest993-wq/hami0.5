-- HQ-placed public verification mark on lawyer photo/cover.
-- Independent of KYC KV (lawyer-verification:). Clients cannot self-grant via UPDATE.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS public_verified_badge boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.public_verified_badge IS
  'HQ-placed public verification mark on lawyer photo/cover. Independent of KYC. Frozen on client UPDATE.';

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
    AND freeze_until IS NOT DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = auth.uid())
    AND login_blocked IS NOT DISTINCT FROM (SELECT p.login_blocked FROM public.profiles p WHERE p.id = auth.uid())
    AND login_until IS NOT DISTINCT FROM (SELECT p.login_until FROM public.profiles p WHERE p.id = auth.uid())
    AND public_verified_badge IS NOT DISTINCT FROM (
      SELECT p.public_verified_badge FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND COALESCE(status, '') IS NOT DISTINCT FROM COALESCE(
      (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    )
  );
