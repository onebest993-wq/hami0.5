-- Close PostgREST privilege oracle: clients must not EXECUTE is_platform_admin().
-- HQ authorization is BFF (requireTrustedHeadquartersAdmin), not RPC.

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
