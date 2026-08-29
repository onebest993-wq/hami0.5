-- HQ session timeline: live rows without exposing auth.sessions or IP.
-- View owner reads auth; only service_role may SELECT the view.

CREATE OR REPLACE VIEW public.hq_account_sessions AS
SELECT
  s.user_id,
  s.created_at,
  s.updated_at,
  s.not_after,
  left(coalesce(s.user_agent, ''), 80) AS user_agent
FROM auth.sessions s;

COMMENT ON VIEW public.hq_account_sessions IS
  'HQ-only session facts for account dossiers. No IP. service_role SELECT only.';

REVOKE ALL ON public.hq_account_sessions FROM PUBLIC;
REVOKE ALL ON public.hq_account_sessions FROM anon;
REVOKE ALL ON public.hq_account_sessions FROM authenticated;
GRANT SELECT ON public.hq_account_sessions TO service_role;
