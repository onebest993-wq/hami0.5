-- HQ connection facts: device class + IP + coarse edge geo. No GPS.
-- auth.sessions.ip is visible to service_role via this view only.
-- DROP required: adding ip before user_agent cannot use CREATE OR REPLACE.

DROP VIEW IF EXISTS public.hq_account_sessions;

CREATE VIEW public.hq_account_sessions AS
SELECT
  s.user_id,
  s.created_at,
  s.updated_at,
  s.not_after,
  host(s.ip) AS ip,
  left(coalesce(s.user_agent, ''), 160) AS user_agent
FROM auth.sessions s;

COMMENT ON VIEW public.hq_account_sessions IS
  'HQ-only session facts. IP + truncated UA for device class. No GPS. service_role SELECT only.';

REVOKE ALL ON public.hq_account_sessions FROM PUBLIC;
REVOKE ALL ON public.hq_account_sessions FROM anon;
REVOKE ALL ON public.hq_account_sessions FROM authenticated;
GRANT SELECT ON public.hq_account_sessions TO service_role;

CREATE TABLE IF NOT EXISTS public.hq_connection_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  seen_at timestamptz NOT NULL DEFAULT now(),
  ip inet,
  device_class text NOT NULL,
  device_label text NOT NULL,
  country_code text,
  city text,
  source text NOT NULL,
  CONSTRAINT hq_connection_signals_source_chk
    CHECK (source IN ('login', 'signup', 'refresh')),
  CONSTRAINT hq_connection_signals_device_class_chk
    CHECK (device_class IN ('android', 'ios', 'windows', 'macos', 'linux', 'web', 'unknown')),
  CONSTRAINT hq_connection_signals_country_chk
    CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT hq_connection_signals_city_chk
    CHECK (city IS NULL OR char_length(city) <= 80),
  CONSTRAINT hq_connection_signals_label_chk
    CHECK (char_length(device_label) <= 80)
);

CREATE INDEX IF NOT EXISTS idx_hq_connection_signals_user_seen
  ON public.hq_connection_signals (user_id, seen_at DESC);

ALTER TABLE public.hq_connection_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hq_connection_signals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_clients_hq_connection_signals ON public.hq_connection_signals;
CREATE POLICY deny_clients_hq_connection_signals
  ON public.hq_connection_signals
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.hq_connection_signals IS
  'HQ operational connection facts from login/refresh. Device class, IP, edge country/city. No GPS, no lat/lng. Last 20 rows per user.';

REVOKE ALL ON TABLE public.hq_connection_signals FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hq_connection_signals TO service_role;
GRANT ALL ON TABLE public.hq_connection_signals TO postgres;

CREATE OR REPLACE FUNCTION public.trim_hq_connection_signals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.hq_connection_signals s
  WHERE s.user_id = NEW.user_id
    AND s.id NOT IN (
      SELECT x.id
      FROM public.hq_connection_signals x
      WHERE x.user_id = NEW.user_id
      ORDER BY x.seen_at DESC
      LIMIT 20
    );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_trim_hq_connection_signals ON public.hq_connection_signals;
CREATE TRIGGER trg_trim_hq_connection_signals
  AFTER INSERT ON public.hq_connection_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_hq_connection_signals();
