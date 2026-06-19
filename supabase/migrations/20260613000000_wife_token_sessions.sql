-- =====================================================
-- WIFE token session store (server-side stolen/cloned token radar)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.wife_token_sessions (
  sub TEXT NOT NULL,
  jti TEXT NOT NULL,
  iat_ms BIGINT NOT NULL,
  device_id TEXT NOT NULL DEFAULT '',
  expires_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (sub, jti)
);

CREATE INDEX IF NOT EXISTS wife_token_sessions_sub_idx
  ON public.wife_token_sessions (sub);

CREATE INDEX IF NOT EXISTS wife_token_sessions_expires_idx
  ON public.wife_token_sessions (expires_at_ms);

COMMENT ON TABLE public.wife_token_sessions
IS 'Server-side WIFE session registry for stolen/cloned JWT detection.';

REVOKE ALL ON TABLE public.wife_token_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wife_token_sessions TO service_role;

ALTER TABLE public.wife_token_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wife_token_sessions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wife_token_sessions_service_role_all ON public.wife_token_sessions;
CREATE POLICY wife_token_sessions_service_role_all
ON public.wife_token_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cleanup_expired_wife_token_sessions()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_count BIGINT;
BEGIN
  DELETE FROM public.wife_token_sessions
  WHERE expires_at_ms < (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_wife_token_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_wife_token_sessions() TO service_role;
