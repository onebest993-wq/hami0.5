-- بحث تشابه دلالي في جدول iraqi_laws (pgvector، بعد 768)
CREATE OR REPLACE FUNCTION public.match_laws(
  query_embedding vector(768),
  match_threshold double precision,
  match_count integer
)
RETURNS TABLE (
  id uuid,
  law_name text,
  article_number text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT
    iraqi_laws.id,
    iraqi_laws.law_name,
    iraqi_laws.article_number,
    iraqi_laws.content,
    (1 - (iraqi_laws.embedding <=> query_embedding))::double precision AS similarity
  FROM iraqi_laws
  WHERE 1 - (iraqi_laws.embedding <=> query_embedding) >= match_threshold
  ORDER BY iraqi_laws.embedding <=> query_embedding ASC
  LIMIT LEAST(COALESCE(NULLIF(match_count, 0), 4), 32);
$$;

COMMENT ON FUNCTION public.match_laws(vector(768), double precision, integer) IS
  'إرجاع أقرب مواد قانونية حسب تشابه جيب التمام (1 - مسافة cosine)';

GRANT EXECUTE ON FUNCTION public.match_laws(vector(768), double precision, integer)
  TO anon, authenticated, service_role;
