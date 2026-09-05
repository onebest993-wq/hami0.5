-- فهرس مستودع المنتدى العام — BFF + service_role فقط (مثل forum_posts).
CREATE TABLE IF NOT EXISTS public.forum_repository_docs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_repository_docs_created
  ON public.forum_repository_docs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_repository_docs_author
  ON public.forum_repository_docs (author_id);

ALTER TABLE public.forum_repository_docs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_repository_docs_deny_clients ON public.forum_repository_docs;
CREATE POLICY forum_repository_docs_deny_clients
  ON public.forum_repository_docs
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.forum_repository_docs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forum_repository_docs TO service_role;
GRANT ALL ON TABLE public.forum_repository_docs TO postgres;

COMMENT ON TABLE public.forum_repository_docs IS
  'مستندات تبويب المستودع في المنتدى — مصدر أخير للبحث والتقليب بين المحامين';
