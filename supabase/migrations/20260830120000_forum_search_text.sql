-- بحث عربي على الخادم — عمود مطبّع مولَّد يطابق normalizeArabicSearch في العميل.
-- بدونه يفشل ILIKE مع «قضية/محكمة/إجراءات/دعوى» لأن الاستعلام يُطبَّع والعمود يبقى خاماً.
-- الحد المعروف: علامات الاتجاه (LRM/RLM) لا تُزال هنا، خلافاً للعميل.

CREATE OR REPLACE FUNCTION public.forum_search_fold(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(
            translate(
              coalesce(input, ''),
              'أإآٱةى٠١٢٣٤٥٦٧٨٩',
              'ااااهي0123456789'
            )
          ),
          '[ًٌٍَُِّْٰـ]', '', 'g'
        ),
        '\s*/\s*', '/', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

COMMENT ON FUNCTION public.forum_search_fold(TEXT) IS
  'طيّ عربي للبحث — يجب أن يطابق normalizeArabicSearch في src/app/services/search';

CREATE OR REPLACE FUNCTION public.forum_tags_join(tags TEXT[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(array_to_string(tags, ' '), '');
$$;


ALTER TABLE public.forum_repository_docs
  ADD COLUMN IF NOT EXISTS search_text TEXT
  GENERATED ALWAYS AS (
    public.forum_search_fold(
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(author_name, '') || ' ' ||
      coalesce(doc_type, '') || ' ' ||
      public.forum_tags_join(tags)
    )
  ) STORED;

ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS search_text TEXT
  GENERATED ALWAYS AS (
    public.forum_search_fold(
      coalesce(content, '') || ' ' ||
      coalesce(author_name, '') || ' ' ||
      public.forum_tags_join(tags)
    )
  ) STORED;

-- الفهارس أفضل جهد: العمود وحده يصحّح النتائج، وpg_trgm يسرّع '%...%' فقط.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS idx_forum_repository_docs_search_trgm
    ON public.forum_repository_docs USING GIN (search_text gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS idx_forum_posts_search_trgm
    ON public.forum_posts USING GIN (search_text gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indexes skipped: %', SQLERRM;
END $$;
