-- =====================================================
-- تشديد خصوصية RLS — المتابعات، الاشتراكات، الحظر
-- =====================================================

-- المتابعات: يرى المستخدم علاقاته فقط (كمتابع أو كمتابَع)
DROP POLICY IF EXISTS forum_follows_select ON public.forum_follows;
CREATE POLICY forum_follows_select ON public.forum_follows
  FOR SELECT TO authenticated
  USING (follower_id = auth.uid() OR following_id = auth.uid());

-- اشتراكات النقاش: المستخدم يرى اشتراكاته فقط
DROP POLICY IF EXISTS forum_post_sub_select ON public.forum_post_subscriptions;
CREATE POLICY forum_post_sub_select ON public.forum_post_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- الحظر: المستخدم يرى حظره الشخصي؛ الإدارة ترى الكل
DROP POLICY IF EXISTS forum_bans_select ON public.forum_bans;
CREATE POLICY forum_bans_select ON public.forum_bans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_forum_admin());
