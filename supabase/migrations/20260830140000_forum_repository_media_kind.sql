-- نوع الملف في SQL يطابق getRepositoryMediaKind — فلترة PDF/صورة قبل LIMIT.
-- updated_at يُحدَّث تلقائياً حتى لا يُمحى تعديل بنفس يوم الرفع.
-- CASE/~* ليسا immutable في PG17؛ الدالة المغلفة تُعلَن IMMUTABLE حتى يُقبل العمود المولَّد.

CREATE OR REPLACE FUNCTION public.forum_repository_media_kind(mime_type TEXT, file_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $func$
  SELECT CASE
    WHEN mime_type LIKE 'image/%'
      OR file_name ~* '\.(jpe?g|png|webp|gif|bmp|heic|heif)$' THEN 'image'
    WHEN mime_type = 'application/pdf' OR file_name ~* '\.pdf$' THEN 'pdf'
    ELSE 'document'
  END;
$func$;

ALTER TABLE public.forum_repository_docs
  ADD COLUMN IF NOT EXISTS media_kind TEXT
  GENERATED ALWAYS AS (
    public.forum_repository_media_kind(mime_type, file_name)
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_forum_repository_docs_media_kind
  ON public.forum_repository_docs (media_kind);

CREATE OR REPLACE FUNCTION public.forum_repository_docs_set_updated_at()
RETURNS TRIGGER AS $trg$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$trg$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_repository_docs_updated ON public.forum_repository_docs;
CREATE TRIGGER trg_forum_repository_docs_updated
  BEFORE UPDATE ON public.forum_repository_docs
  FOR EACH ROW EXECUTE FUNCTION public.forum_repository_docs_set_updated_at();

COMMENT ON COLUMN public.forum_repository_docs.media_kind IS
  'image | pdf | document — يطابق getRepositoryMediaKind في العميل';
