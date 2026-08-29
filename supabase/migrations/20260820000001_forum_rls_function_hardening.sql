-- Deny direct client access on remaining forum tables; lock function execute.
CREATE POLICY forum_bookmarks_deny ON public.forum_bookmarks FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_comment_reports_deny ON public.forum_comment_reports FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_comment_upvotes_deny ON public.forum_comment_upvotes FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_groups_deny ON public.forum_groups FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY forum_group_members_deny ON public.forum_group_members FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.forum_posts_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_forum_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_forum_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_forum_admin() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.is_forum_admin() TO service_role;

REVOKE EXECUTE ON FUNCTION public.can_access_lawyer_forum() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_lawyer_forum() FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_access_lawyer_forum() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lawyer_forum() TO service_role;
