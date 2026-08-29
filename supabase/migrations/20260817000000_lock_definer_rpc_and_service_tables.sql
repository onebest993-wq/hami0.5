-- Close PostgREST RPC on auth-trigger functions. Triggers still run as table owner.
-- BFF-only tables keep RLS fail-closed with an explicit deny policy for clients.

REVOKE ALL ON FUNCTION public.handle_new_auth_user_profile() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user_profile() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user_profile() TO postgres, service_role, supabase_auth_admin;

REVOKE ALL ON FUNCTION public.strip_privileged_user_metadata() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.strip_privileged_user_metadata() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.strip_privileged_user_metadata() TO postgres, service_role, supabase_auth_admin;

REVOKE ALL ON FUNCTION public.is_forum_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_forum_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_forum_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "deny_clients_admin_otp_challenges" ON public.admin_otp_challenges;
CREATE POLICY "deny_clients_admin_otp_challenges"
  ON public.admin_otp_challenges
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_clients_admin_trusted_devices" ON public.admin_trusted_devices;
CREATE POLICY "deny_clients_admin_trusted_devices"
  ON public.admin_trusted_devices
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_clients_kv_store" ON public.kv_store_f09713ba;
CREATE POLICY "deny_clients_kv_store"
  ON public.kv_store_f09713ba
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
