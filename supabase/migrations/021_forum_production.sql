-- =====================================================
-- منتدى المحامين — جداول إنتاج + RLS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------
-- Helper: هل المستخدم إدارة المنتدى؟
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_forum_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role') IN ('SUPER_ADMIN', 'MODERATOR'),
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('SUPER_ADMIN', 'MODERATOR'),
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('SUPER_ADMIN', 'MODERATOR'),
    false
  );
$$;

-- -----------------------------------------------------
-- forum_posts
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  attachment JSONB,
  upvoter_ids UUID[] NOT NULL DEFAULT '{}',
  best_comment_id UUID,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON public.forum_posts (is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author ON public.forum_posts (author_id);

-- -----------------------------------------------------
-- forum_comments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_comments_post ON public.forum_comments (post_id, created_at);

ALTER TABLE public.forum_posts
  DROP CONSTRAINT IF EXISTS forum_posts_best_comment_fk;
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_best_comment_fk
  FOREIGN KEY (best_comment_id) REFERENCES public.forum_comments(id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- forum_reports
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dismissed', 'resolved')),
  reviewed_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_forum_reports_pending_unique
  ON public.forum_reports (post_id, reporter_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON public.forum_reports (status, created_at DESC);

-- -----------------------------------------------------
-- forum_bans
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.forum_bans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_bans ENABLE ROW LEVEL SECURITY;

-- Posts: قراءة لكل مسجل
DROP POLICY IF EXISTS forum_posts_select ON public.forum_posts;
CREATE POLICY forum_posts_select ON public.forum_posts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_posts_insert ON public.forum_posts;
CREATE POLICY forum_posts_insert ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_posts_update ON public.forum_posts;
CREATE POLICY forum_posts_update ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_forum_admin())
  WITH CHECK (author_id = auth.uid() OR public.is_forum_admin());

DROP POLICY IF EXISTS forum_posts_delete ON public.forum_posts;
CREATE POLICY forum_posts_delete ON public.forum_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_forum_admin());

-- Comments
DROP POLICY IF EXISTS forum_comments_select ON public.forum_comments;
CREATE POLICY forum_comments_select ON public.forum_comments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_comments_insert ON public.forum_comments;
CREATE POLICY forum_comments_insert ON public.forum_comments
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_comments_update ON public.forum_comments;
CREATE POLICY forum_comments_update ON public.forum_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS forum_comments_delete ON public.forum_comments;
CREATE POLICY forum_comments_delete ON public.forum_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_forum_admin());

-- Reports
DROP POLICY IF EXISTS forum_reports_select ON public.forum_reports;
CREATE POLICY forum_reports_select ON public.forum_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_forum_admin());

DROP POLICY IF EXISTS forum_reports_insert ON public.forum_reports;
CREATE POLICY forum_reports_insert ON public.forum_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS forum_reports_update ON public.forum_reports;
CREATE POLICY forum_reports_update ON public.forum_reports
  FOR UPDATE TO authenticated
  USING (public.is_forum_admin());

-- Bans: قراءة للجميع (للتحقق من الحظر)، كتابة للإدارة فقط
DROP POLICY IF EXISTS forum_bans_select ON public.forum_bans;
CREATE POLICY forum_bans_select ON public.forum_bans
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_bans_write ON public.forum_bans;
CREATE POLICY forum_bans_write ON public.forum_bans
  FOR ALL TO authenticated
  USING (public.is_forum_admin())
  WITH CHECK (public.is_forum_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.forum_posts_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_forum_posts_updated ON public.forum_posts;
CREATE TRIGGER trg_forum_posts_updated
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_posts_set_updated_at();
