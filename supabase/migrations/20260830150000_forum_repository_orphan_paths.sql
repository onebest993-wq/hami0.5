-- طابور كنس ملفات المستودع التي بقيَت في Storage بعد سقوط صف الفهرس.

CREATE TABLE IF NOT EXISTS public.forum_repository_orphan_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_forum_repository_orphan_author
  ON public.forum_repository_orphan_paths (author_id, created_at);

ALTER TABLE public.forum_repository_orphan_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_repository_orphan_paths_deny_clients ON public.forum_repository_orphan_paths;
CREATE POLICY forum_repository_orphan_paths_deny_clients
  ON public.forum_repository_orphan_paths
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.forum_repository_orphan_paths FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.forum_repository_orphan_paths TO service_role;
GRANT ALL ON TABLE public.forum_repository_orphan_paths TO postgres;

COMMENT ON TABLE public.forum_repository_orphan_paths IS
  'مسارات Storage فشلت إزالتها بعد حذف فهرس المستودع — تُكنس عند القائمة التالية';
