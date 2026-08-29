-- إزالة متجهات البحث الدلالي وأي دوال تعتمد عليها.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname IN ('hybrid_search_laws', 'match_laws', 'hybrid_search_decisions')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', r.sig);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.iraqi_laws_embedding_hnsw;
DROP INDEX IF EXISTS public.cassation_decisions_embedding_hnsw;

ALTER TABLE IF EXISTS public.iraqi_laws DROP COLUMN IF EXISTS embedding;
ALTER TABLE IF EXISTS public.cassation_decisions DROP COLUMN IF EXISTS embedding;

DO $$
BEGIN
  IF to_regclass('public.iraqi_laws') IS NOT NULL THEN
    EXECUTE $c$COMMENT ON TABLE public.iraqi_laws IS 'مواد تشريعية عراقية'$c$;
  END IF;
  IF to_regclass('public.cassation_decisions') IS NOT NULL THEN
    EXECUTE $c$COMMENT ON TABLE public.cassation_decisions IS 'قرارات تمييزية — نص مرجعي فقط'$c$;
  END IF;
END $$;

DROP EXTENSION IF EXISTS vector CASCADE;
