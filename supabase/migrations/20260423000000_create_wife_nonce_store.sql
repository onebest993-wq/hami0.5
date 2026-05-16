-- =====================================================
-- WIFE Nonce Store (Production-grade anti-replay storage)
-- =====================================================

-- 1) Table
CREATE TABLE IF NOT EXISTS public.wife_nonce_store (
  nonce TEXT PRIMARY KEY,
  expires_at_ms BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.wife_nonce_store
IS 'Distributed nonce storage for WIFE replay protection.';

COMMENT ON COLUMN public.wife_nonce_store.nonce
IS 'One-time nonce value (unique).';

COMMENT ON COLUMN public.wife_nonce_store.expires_at_ms
IS 'Nonce expiry timestamp in Unix milliseconds.';

-- 2) Lock down direct access
REVOKE ALL ON TABLE public.wife_nonce_store FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wife_nonce_store TO service_role;

-- 3) Enforce RLS with service-role-only policies
ALTER TABLE public.wife_nonce_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wife_nonce_store FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wife_nonce_store_service_role_select ON public.wife_nonce_store;
CREATE POLICY wife_nonce_store_service_role_select
ON public.wife_nonce_store
FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS wife_nonce_store_service_role_insert ON public.wife_nonce_store;
CREATE POLICY wife_nonce_store_service_role_insert
ON public.wife_nonce_store
FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS wife_nonce_store_service_role_update ON public.wife_nonce_store;
CREATE POLICY wife_nonce_store_service_role_update
ON public.wife_nonce_store
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS wife_nonce_store_service_role_delete ON public.wife_nonce_store;
CREATE POLICY wife_nonce_store_service_role_delete
ON public.wife_nonce_store
FOR DELETE
TO service_role
USING (true);

-- 4) Cleanup function for expired rows
CREATE OR REPLACE FUNCTION public.cleanup_expired_wife_nonces()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count BIGINT := 0;
BEGIN
  DELETE FROM public.wife_nonce_store
  WHERE expires_at_ms < (EXTRACT(EPOCH FROM now()) * 1000)::BIGINT;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_wife_nonces()
IS 'Deletes expired WIFE nonces and returns number of deleted rows.';

-- 5) Optional auto-cleanup scheduling (if pg_cron exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'wife_nonce_cleanup_every_5m';

    PERFORM cron.schedule(
      'wife_nonce_cleanup_every_5m',
      '*/5 * * * *',
      $$SELECT public.cleanup_expired_wife_nonces();$$
    );
  END IF;
END;
$$;

