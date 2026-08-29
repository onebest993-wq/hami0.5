-- Timed HQ freeze: expiry lives on profiles so WIFE can unfreeze after GoTrue duration ends.
-- Clients cannot clear freeze_until (same freeze as is_banned / is_active).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS freeze_until timestamptz;

COMMENT ON COLUMN public.profiles.freeze_until IS
  'HQ timed freeze expiry; NULL means freeze is permanent via is_banned only.';

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
    AND COALESCE(status, '') IS NOT DISTINCT FROM COALESCE(
      (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    )
  );
