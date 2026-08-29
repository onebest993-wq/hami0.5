-- HQ login lock is separate from network freeze (freeze_until / is_banned).
-- Clients cannot clear login_blocked / login_until.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_blocked boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS login_until timestamptz;

COMMENT ON COLUMN public.profiles.login_blocked IS
  'HQ permanent login lock. Independent of forum/network freeze.';

COMMENT ON COLUMN public.profiles.login_until IS
  'HQ timed login lock expiry; NULL means use login_blocked only.';

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
    AND COALESCE(status, '') IS NOT DISTINCT FROM COALESCE(
      (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    )
  );
