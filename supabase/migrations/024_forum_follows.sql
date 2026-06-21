-- =====================================================
-- منتدى المحامين — نظام المتابعة والتفضيلات
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_posts BOOLEAN NOT NULL DEFAULT true,
  notify_comments BOOLEAN NOT NULL DEFAULT true,
  notify_replies BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT forum_follows_no_self CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_follows_following ON public.forum_follows (following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_follows_follower ON public.forum_follows (follower_id, created_at DESC);

ALTER TABLE public.forum_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_follows_select ON public.forum_follows;
CREATE POLICY forum_follows_select ON public.forum_follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_follows_insert ON public.forum_follows;
CREATE POLICY forum_follows_insert ON public.forum_follows
  FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS forum_follows_update ON public.forum_follows;
CREATE POLICY forum_follows_update ON public.forum_follows
  FOR UPDATE TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS forum_follows_delete ON public.forum_follows;
CREATE POLICY forum_follows_delete ON public.forum_follows
  FOR DELETE TO authenticated
  USING (follower_id = auth.uid());
