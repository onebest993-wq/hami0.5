-- Harden grants so service_role / authenticated / anon behave correctly after profiles bootstrap.
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO postgres;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kv_store_f09713ba TO service_role;
GRANT ALL ON TABLE public.kv_store_f09713ba TO postgres;

-- Ensure RLS enabled (policies already set for authenticated self-update freeze)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_f09713ba ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS by default in Supabase; keep table privileges explicit.
SELECT
  has_table_privilege('service_role', 'public.profiles', 'SELECT') AS service_can_select_profiles,
  has_table_privilege('service_role', 'public.kv_store_f09713ba', 'SELECT') AS service_can_select_kv,
  to_regclass('public.profiles') IS NOT NULL AS profiles_ok,
  to_regclass('public.kv_store_f09713ba') IS NOT NULL AS kv_ok,
  (SELECT count(*)::int FROM public.profiles) AS profile_rows,
  (SELECT count(*)::int FROM public.kv_store_f09713ba WHERE key LIKE 'lawyer-verification:%' AND value->>'status'='active') AS active_verifications;
