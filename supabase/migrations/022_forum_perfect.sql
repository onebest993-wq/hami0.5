-- =====================================================
-- منتدى المحامين — توسعة لمستوى «الكمال»
-- bookmarks + comment upvotes + lock discussion +
-- comment reports + sort comments
--
-- ⚠️ تنبيه: يجب تطبيق هذا الـ migration على قاعدة بيانات Supabase
-- قبل استخدام الميزات الجديدة في الإنتاج.
-- الأمر: supabase db push   أو   psql -f 022_forum_perfect.sql
-- =====================================================

-- -----------------------------------------------------
-- 1) Lock discussion: عمود is_locked على forum_posts
-- -----------------------------------------------------
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- -----------------------------------------------------
-- 2) forum_bookmarks (حفظ منشور للقراءة لاحقاً)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_bookmarks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_bookmarks_user ON public.forum_bookmarks (user_id, created_at DESC);

ALTER TABLE public.forum_bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_bookmarks_select ON public.forum_bookmarks;
CREATE POLICY forum_bookmarks_select ON public.forum_bookmarks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS forum_bookmarks_write ON public.forum_bookmarks;
CREATE POLICY forum_bookmarks_write ON public.forum_bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------
-- 3) forum_comment_upvotes (تصويت على التعليقات)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_comment_upvotes (
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_comment_upvotes_comment ON public.forum_comment_upvotes (comment_id);

ALTER TABLE public.forum_comment_upvotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_comment_upvotes_select ON public.forum_comment_upvotes;
CREATE POLICY forum_comment_upvotes_select ON public.forum_comment_upvotes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_comment_upvotes_write ON public.forum_comment_upvotes;
CREATE POLICY forum_comment_upvotes_write ON public.forum_comment_upvotes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- -----------------------------------------------------
-- 4) forum_comment_reports (الإبلاغ عن تعليق)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_comment_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  reviewed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_comment_reports_pending_unique
  ON public.forum_comment_reports (comment_id, reporter_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_forum_comment_reports_status
  ON public.forum_comment_reports (status, created_at DESC);

ALTER TABLE public.forum_comment_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_comment_reports_select ON public.forum_comment_reports;
CREATE POLICY forum_comment_reports_select ON public.forum_comment_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_forum_admin());

DROP POLICY IF EXISTS forum_comment_reports_insert ON public.forum_comment_reports;
CREATE POLICY forum_comment_reports_insert ON public.forum_comment_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS forum_comment_reports_update ON public.forum_comment_reports;
CREATE POLICY forum_comment_reports_update ON public.forum_comment_reports
  FOR UPDATE TO authenticated
  USING (public.is_forum_admin());
