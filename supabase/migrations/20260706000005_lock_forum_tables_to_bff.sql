-- =====================================================
-- Forum hardening: direct client access blocked, BFF/service_role only
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_access_lawyer_forum()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('lawyer', 'moderator', 'admin')
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_deleted, false) = false
      AND COALESCE(p.is_active, true) = true
  );
$$;

-- المنتدى يُدار عبر BFF + service_role فقط. لا نسمح بقراءة/كتابة العميل مباشرة.
DROP POLICY IF EXISTS forum_posts_select ON public.forum_posts;
CREATE POLICY forum_posts_select ON public.forum_posts
  FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS forum_posts_insert ON public.forum_posts;
CREATE POLICY forum_posts_insert ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_posts_update ON public.forum_posts;
CREATE POLICY forum_posts_update ON public.forum_posts
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_posts_delete ON public.forum_posts;
CREATE POLICY forum_posts_delete ON public.forum_posts
  FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_comments_select ON public.forum_comments;
CREATE POLICY forum_comments_select ON public.forum_comments
  FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS forum_comments_insert ON public.forum_comments;
CREATE POLICY forum_comments_insert ON public.forum_comments
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_comments_update ON public.forum_comments;
CREATE POLICY forum_comments_update ON public.forum_comments
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_comments_delete ON public.forum_comments;
CREATE POLICY forum_comments_delete ON public.forum_comments
  FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_reports_select ON public.forum_reports;
CREATE POLICY forum_reports_select ON public.forum_reports
  FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_reports_insert ON public.forum_reports;
CREATE POLICY forum_reports_insert ON public.forum_reports
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_reports_update ON public.forum_reports;
CREATE POLICY forum_reports_update ON public.forum_reports
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_bans_select ON public.forum_bans;
CREATE POLICY forum_bans_select ON public.forum_bans
  FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_bans_write ON public.forum_bans;
CREATE POLICY forum_bans_write ON public.forum_bans
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_follows_select ON public.forum_follows;
CREATE POLICY forum_follows_select ON public.forum_follows
  FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_follows_insert ON public.forum_follows;
CREATE POLICY forum_follows_insert ON public.forum_follows
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_follows_update ON public.forum_follows;
CREATE POLICY forum_follows_update ON public.forum_follows
  FOR UPDATE TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_follows_delete ON public.forum_follows;
CREATE POLICY forum_follows_delete ON public.forum_follows
  FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_post_sub_select ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_select ON public.forum_post_subscriptions
  FOR SELECT TO authenticated
  USING (false);

DROP POLICY IF EXISTS forum_post_sub_insert ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_insert ON public.forum_post_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS forum_post_sub_delete ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_delete ON public.forum_post_subscriptions
  FOR DELETE TO authenticated
  USING (false);
