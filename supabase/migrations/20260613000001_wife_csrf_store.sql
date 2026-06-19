-- Server-side CSRF token store for WIFE (subject-bound tokens)

CREATE TABLE IF NOT EXISTS public.wife_csrf_store (
  sub TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at_ms BIGINT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wife_csrf_store_expires_idx
  ON public.wife_csrf_store (expires_at_ms);

REVOKE ALL ON TABLE public.wife_csrf_store FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wife_csrf_store TO service_role;

ALTER TABLE public.wife_csrf_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wife_csrf_store FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wife_csrf_store_service_role_all ON public.wife_csrf_store;
CREATE POLICY wife_csrf_store_service_role_all
ON public.wife_csrf_store
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
