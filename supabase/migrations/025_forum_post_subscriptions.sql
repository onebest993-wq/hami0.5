-- =====================================================
-- متابعة نقاش/منشور — تنبيهات على التعليقات والردود
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_post_subscriptions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_post_sub_post ON public.forum_post_subscriptions (post_id);

ALTER TABLE public.forum_post_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_post_sub_select ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_select ON public.forum_post_subscriptions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS forum_post_sub_insert ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_insert ON public.forum_post_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS forum_post_sub_delete ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_delete ON public.forum_post_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
