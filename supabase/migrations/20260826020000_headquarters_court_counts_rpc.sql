-- تجميع إحصائيات المقر في Postgres (service_role فقط — ليس RPC للمتصفح).
CREATE OR REPLACE FUNCTION public.headquarters_court_counts()
RETURNS TABLE(court text, lawsuits bigint, executions bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH l AS (
    SELECT
      COALESCE(NULLIF(btrim(court), ''), 'غير محدد') AS court,
      COUNT(*)::bigint AS n
    FROM public.lawsuit_files
    WHERE status = 'active'
    GROUP BY 1
  ),
  e AS (
    SELECT
      COALESCE(NULLIF(btrim(court), ''), 'غير محدد') AS court,
      COUNT(*)::bigint AS n
    FROM public.execution_files
    WHERE status = 'active'
    GROUP BY 1
  )
  SELECT
    COALESCE(l.court, e.court) AS court,
    COALESCE(l.n, 0) AS lawsuits,
    COALESCE(e.n, 0) AS executions
  FROM l
  FULL OUTER JOIN e ON l.court = e.court
  ORDER BY (COALESCE(l.n, 0) + COALESCE(e.n, 0)) DESC
  LIMIT 60;
$$;

REVOKE ALL ON FUNCTION public.headquarters_court_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.headquarters_court_counts() FROM anon;
REVOKE ALL ON FUNCTION public.headquarters_court_counts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.headquarters_court_counts() TO service_role;

COMMENT ON FUNCTION public.headquarters_court_counts() IS
  'HQ BFF court aggregation — EXECUTE granted to service_role only';
