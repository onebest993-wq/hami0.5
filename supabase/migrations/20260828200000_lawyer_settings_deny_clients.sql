-- Close leftover "Allow full access for dev" (USING true) + GRANT ALL to anon.
-- Cloud sync goes through /api/settings/cloud-sync with service_role only.

ALTER TABLE public.lawyer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_settings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access for dev" ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_dev_user_all ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_dev_fallback ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_select ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_insert ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_update ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_delete ON public.lawyer_settings;
DROP POLICY IF EXISTS deny_clients_lawyer_settings ON public.lawyer_settings;

REVOKE ALL ON TABLE public.lawyer_settings FROM PUBLIC;
REVOKE ALL ON TABLE public.lawyer_settings FROM anon;
REVOKE ALL ON TABLE public.lawyer_settings FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawyer_settings TO service_role;
GRANT ALL ON TABLE public.lawyer_settings TO postgres;

CREATE POLICY deny_clients_lawyer_settings
  ON public.lawyer_settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.lawyer_settings IS
  'Cloud settings blob — BFF + service_role only. Clients cannot SELECT/INSERT via PostgREST.';
