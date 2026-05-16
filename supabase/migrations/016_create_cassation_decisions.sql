-- =====================================================
-- Cassation Decisions (Jurisprudence RAG)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.cassation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_number TEXT NOT NULL,
  decision_date DATE NOT NULL,
  court_name TEXT NOT NULL,
  legal_principle TEXT NOT NULL,
  full_text TEXT NOT NULL,
  related_article TEXT,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cassation_decisions_number_date_uidx
  ON public.cassation_decisions (decision_number, decision_date);

CREATE INDEX IF NOT EXISTS cassation_decisions_embedding_hnsw
  ON public.cassation_decisions
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS cassation_decisions_decision_date_idx
  ON public.cassation_decisions (decision_date DESC);

ALTER TABLE public.cassation_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cassation_decisions_select_public ON public.cassation_decisions;
CREATE POLICY cassation_decisions_select_public
  ON public.cassation_decisions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Optional hardening: disallow writes for anon/authenticated
REVOKE INSERT, UPDATE, DELETE ON public.cassation_decisions FROM anon, authenticated;

-- =====================================================
-- Hybrid search RPC for jurisprudence
-- =====================================================
CREATE OR REPLACE FUNCTION public.hybrid_search_decisions(
  query_embedding vector(768),
  query_text text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.2
)
RETURNS TABLE (
  id uuid,
  decision_number text,
  decision_date date,
  court_name text,
  legal_principle text,
  full_text text,
  related_article text,
  similarity double precision,
  text_rank double precision,
  hybrid_score double precision
)
LANGUAGE sql
STABLE
AS $$
WITH q AS (
  WITH terms AS (
    SELECT btrim(tok, ' ''"()[]{}:;,.،؛!?؟') AS term
    FROM regexp_split_to_table(
      replace(
        replace(
          replace(
            replace(coalesce(query_text, ''), '؟', ' '),
            '?',
            ' '
          ),
          '،',
          ' '
        ),
        '؛',
        ' '
      ),
      '\s+'
    ) AS tok
    WHERE length(btrim(tok, ' ''"()[]{}:;,.،؛!?؟')) >= 2
  )
  SELECT
    COALESCE(NULLIF(trim(query_text), ''), '') AS qtext,
    CASE
      WHEN (SELECT count(*) FROM terms) = 0 THEN NULL::tsquery
      ELSE to_tsquery(
        'simple',
        (SELECT string_agg(replace(term, '''', '') || ':*', ' | ') FROM terms)
      )
    END AS tsq
),
vector_hits AS (
  SELECT
    d.id,
    d.decision_number,
    d.decision_date,
    d.court_name,
    d.legal_principle,
    d.full_text,
    d.related_article,
    (1 - (d.embedding <=> query_embedding))::double precision AS similarity,
    ROW_NUMBER() OVER (ORDER BY d.embedding <=> query_embedding ASC) AS vector_rank
  FROM public.cassation_decisions d
  WHERE 1 - (d.embedding <=> query_embedding) >= match_threshold
  ORDER BY d.embedding <=> query_embedding ASC
  LIMIT 120
),
text_hits AS (
  SELECT
    d.id,
    d.decision_number,
    d.decision_date,
    d.court_name,
    d.legal_principle,
    d.full_text,
    d.related_article,
    ts_rank_cd(
      to_tsvector(
        'simple',
        coalesce(d.decision_number, '') || ' ' ||
        coalesce(d.court_name, '') || ' ' ||
        coalesce(d.related_article, '') || ' ' ||
        coalesce(d.legal_principle, '') || ' ' ||
        coalesce(d.full_text, '')
      ),
      q.tsq
    )::double precision AS text_rank,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank_cd(
        to_tsvector(
          'simple',
          coalesce(d.decision_number, '') || ' ' ||
          coalesce(d.court_name, '') || ' ' ||
          coalesce(d.related_article, '') || ' ' ||
          coalesce(d.legal_principle, '') || ' ' ||
          coalesce(d.full_text, '')
        ),
        q.tsq
      ) DESC
    ) AS text_rank_pos
  FROM public.cassation_decisions d
  CROSS JOIN q
  WHERE q.tsq IS NOT NULL
    AND to_tsvector(
      'simple',
      coalesce(d.decision_number, '') || ' ' ||
      coalesce(d.court_name, '') || ' ' ||
      coalesce(d.related_article, '') || ' ' ||
      coalesce(d.legal_principle, '') || ' ' ||
      coalesce(d.full_text, '')
    ) @@ q.tsq
  LIMIT 120
),
combined AS (
  SELECT
    COALESCE(v.id, t.id) AS id,
    COALESCE(v.decision_number, t.decision_number) AS decision_number,
    COALESCE(v.decision_date, t.decision_date) AS decision_date,
    COALESCE(v.court_name, t.court_name) AS court_name,
    COALESCE(v.legal_principle, t.legal_principle) AS legal_principle,
    COALESCE(v.full_text, t.full_text) AS full_text,
    COALESCE(v.related_article, t.related_article) AS related_article,
    v.similarity,
    t.text_rank,
    v.vector_rank,
    t.text_rank_pos
  FROM vector_hits v
  FULL OUTER JOIN text_hits t USING (id)
)
SELECT
  c.id,
  c.decision_number,
  c.decision_date,
  c.court_name,
  c.legal_principle,
  c.full_text,
  c.related_article,
  c.similarity,
  c.text_rank,
  (
    COALESCE(1.0 / (60 + c.vector_rank), 0.0) +
    COALESCE(1.2 / (60 + c.text_rank_pos), 0.0)
  )::double precision AS hybrid_score
FROM combined c
ORDER BY hybrid_score DESC, decision_date DESC NULLS LAST
LIMIT GREATEST(COALESCE(match_count, 5), 1);
$$;

GRANT EXECUTE ON FUNCTION public.hybrid_search_decisions(vector(768), text, integer, double precision)
  TO anon, authenticated, service_role;

COMMENT ON TABLE public.cassation_decisions IS 'أحدث قرارات محكمة التمييز (الاجتهاد القضائي) للربط مع محرك RAG.';
COMMENT ON FUNCTION public.hybrid_search_decisions(vector(768), text, integer, double precision)
  IS 'Hybrid search over cassation decisions: vector + full-text RRF.';
