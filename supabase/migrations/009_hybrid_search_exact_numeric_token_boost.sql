-- Fix numeric article matching in hybrid_search_laws.
-- Root cause: \y word-boundary regex does not match Arabic-prefixed article strings reliably (e.g., "المادة 5").
-- This migration switches to exact numeric token matching extracted from article_number.
CREATE OR REPLACE FUNCTION public.hybrid_search_laws(
  query_embedding vector(768),
  query_text text,
  match_count integer DEFAULT 5,
  match_threshold double precision DEFAULT 0.2
)
RETURNS TABLE (
  id bigint,
  law_name text,
  article_number text,
  content text,
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
query_numbers AS (
  SELECT DISTINCT regexp_replace(n, '\D', '', 'g') AS num
  FROM regexp_split_to_table(
    regexp_replace(
      translate(coalesce(query_text, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
      '[^0-9]+',
      ' ',
      'g'
    ),
    '\s+'
  ) AS n
  WHERE n <> ''
),
vector_hits AS (
  SELECT
    l.id,
    l.law_name,
    l.article_number,
    l.content,
    (1 - (l.embedding <=> query_embedding))::double precision AS similarity,
    ROW_NUMBER() OVER (ORDER BY l.embedding <=> query_embedding ASC) AS vector_rank
  FROM public.iraqi_laws l
  WHERE 1 - (l.embedding <=> query_embedding) >= match_threshold
  ORDER BY l.embedding <=> query_embedding ASC
  LIMIT 120
),
text_hits AS (
  SELECT
    l.id,
    l.law_name,
    l.article_number,
    l.content,
    ts_rank_cd(
      to_tsvector(
        'simple',
        coalesce(l.law_name, '') || ' ' ||
        coalesce(l.article_number, '') || ' ' ||
        coalesce(l.content, '')
      ),
      q.tsq
    )::double precision AS text_rank,
    ROW_NUMBER() OVER (
      ORDER BY ts_rank_cd(
        to_tsvector(
          'simple',
          coalesce(l.law_name, '') || ' ' ||
          coalesce(l.article_number, '') || ' ' ||
          coalesce(l.content, '')
        ),
        q.tsq
      ) DESC
    ) AS text_rank_pos
  FROM public.iraqi_laws l
  CROSS JOIN q
  WHERE q.tsq IS NOT NULL
    AND to_tsvector(
      'simple',
      coalesce(l.law_name, '') || ' ' ||
      coalesce(l.article_number, '') || ' ' ||
      coalesce(l.content, '')
    ) @@ q.tsq
  LIMIT 120
),
keyword_hits AS (
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
    l.id,
    l.law_name,
    l.article_number,
    l.content,
    COALESCE((
      SELECT sum(
        CASE
          WHEN coalesce(l.article_number, '') ILIKE '%' || t.term || '%' THEN 3.0
          WHEN coalesce(l.law_name, '') ILIKE '%' || t.term || '%' THEN 1.5
          WHEN coalesce(l.content, '') ILIKE '%' || t.term || '%' THEN 1.0
          ELSE 0.0
        END
      )
      FROM terms t
    ), 0.0)::double precision AS keyword_score
  FROM public.iraqi_laws l
),
keyword_ranked AS (
  SELECT
    k.id,
    k.law_name,
    k.article_number,
    k.content,
    k.keyword_score,
    ROW_NUMBER() OVER (ORDER BY k.keyword_score DESC, k.id) AS keyword_rank_pos
  FROM keyword_hits k
  WHERE k.keyword_score > 0
  LIMIT 120
),
article_number_hits AS (
  SELECT
    l.id,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM query_numbers qn
        WHERE qn.num <> ''
          AND qn.num = ANY(
            regexp_split_to_array(
              trim(
                regexp_replace(
                  translate(coalesce(l.article_number, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
                  '[^0-9]+',
                  ' ',
                  'g'
                )
              ),
              '\s+'
            )
          )
      ) THEN 1500.0
      WHEN EXISTS (
        SELECT 1
        FROM query_numbers qn
        WHERE qn.num <> ''
          AND regexp_replace(
            translate(coalesce(l.content, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'),
            '\s+',
            ' ',
            'g'
          ) ~ ('(?:الماده|ماده|المادة|مادة)\s*' || qn.num || '(?![0-9])')
      ) THEN 500.0
      ELSE 0.0
    END::double precision AS article_boost
  FROM public.iraqi_laws l
),
combined AS (
  SELECT
    COALESCE(v.id, t.id, k.id, a.id) AS id,
    COALESCE(v.law_name, t.law_name, k.law_name) AS law_name,
    COALESCE(v.article_number, t.article_number, k.article_number) AS article_number,
    COALESCE(v.content, t.content, k.content) AS content,
    v.similarity,
    t.text_rank,
    k.keyword_score,
    v.vector_rank,
    t.text_rank_pos,
    k.keyword_rank_pos,
    COALESCE(a.article_boost, 0.0) AS article_boost
  FROM vector_hits v
  FULL OUTER JOIN text_hits t USING (id)
  FULL OUTER JOIN keyword_ranked k USING (id)
  FULL OUTER JOIN article_number_hits a USING (id)
),
scored AS (
  SELECT
    c.id,
    c.law_name,
    c.article_number,
    c.content,
    c.similarity,
    c.text_rank,
    (
      COALESCE(1.0 / (60 + c.vector_rank), 0.0) +
      COALESCE(1.1 / (60 + c.text_rank_pos), 0.0) +
      COALESCE(1.8 / (60 + c.keyword_rank_pos), 0.0) +
      COALESCE(c.article_boost, 0.0)
    )::double precision AS hybrid_score
  FROM combined c
),
dedup_by_id AS (
  SELECT
    s.*,
    ROW_NUMBER() OVER (
      PARTITION BY s.id
      ORDER BY s.hybrid_score DESC, s.similarity DESC NULLS LAST, s.text_rank DESC NULLS LAST
    ) AS rn
  FROM scored s
)
SELECT
  d.id,
  d.law_name,
  d.article_number,
  d.content,
  d.similarity,
  d.text_rank,
  d.hybrid_score
FROM dedup_by_id d
WHERE d.rn = 1
ORDER BY d.hybrid_score DESC, d.similarity DESC NULLS LAST, d.text_rank DESC NULLS LAST
LIMIT GREATEST(COALESCE(match_count, 5), 1);
$$;

COMMENT ON FUNCTION public.hybrid_search_laws(vector(768), text, integer, double precision)
  IS 'Hybrid search with exact numeric token boost for article_number + fallback numeric content boost';

GRANT EXECUTE ON FUNCTION public.hybrid_search_laws(vector(768), text, integer, double precision)
  TO anon, authenticated, service_role;
