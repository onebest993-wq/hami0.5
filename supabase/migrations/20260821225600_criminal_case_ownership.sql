-- إثبات ملكية إضبارة جزائية على الخادم (لا حمولة مشفّرة — الجزائي محلي فقط).
-- يُستخدم لمسار CaseShare create بعد register من العميل المصادَق.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.criminal_case_ownership (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    external_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT criminal_case_ownership_user_external_id_unique UNIQUE (user_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_criminal_case_ownership_user
  ON public.criminal_case_ownership (user_id);

CREATE INDEX IF NOT EXISTS idx_criminal_case_ownership_user_updated
  ON public.criminal_case_ownership (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_criminal_case_ownership_updated_at ON public.criminal_case_ownership;
CREATE TRIGGER update_criminal_case_ownership_updated_at
  BEFORE UPDATE ON public.criminal_case_ownership
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.criminal_case_ownership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "criminal_case_ownership_select_own" ON public.criminal_case_ownership;
DROP POLICY IF EXISTS "criminal_case_ownership_insert_own" ON public.criminal_case_ownership;
DROP POLICY IF EXISTS "criminal_case_ownership_update_own" ON public.criminal_case_ownership;
DROP POLICY IF EXISTS "criminal_case_ownership_delete_own" ON public.criminal_case_ownership;

CREATE POLICY "criminal_case_ownership_select_own"
    ON public.criminal_case_ownership FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "criminal_case_ownership_insert_own"
    ON public.criminal_case_ownership FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "criminal_case_ownership_update_own"
    ON public.criminal_case_ownership FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "criminal_case_ownership_delete_own"
    ON public.criminal_case_ownership FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.criminal_case_ownership IS
  'إثبات ملكية إضبارة جزائية للمشاركة — بدون حمولة؛ التسجيل عبر BFF بعد تحقق محلي';
COMMENT ON COLUMN public.criminal_case_ownership.external_id IS
  'معرّف الإضبارة في criminalStore؛ فريد لكل user_id';

-- مسح الإعدادات: حذف إثباتات الملكية مع بقية البيانات القانونية
CREATE OR REPLACE FUNCTION public.wipe_user_application_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  affected bigint := 0;
  legal_rows bigint := 0;
  settings_rows bigint := 0;
  notification_rows bigint := 0;
  forum_rows bigint := 0;
  sharing_rows bigint := 0;
  calendar_rows bigint := 0;
  legacy_kv_rows bigint := 0;
  sanitized_forum_rows bigint := 0;
  uid_text text := p_user_id::text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  DELETE FROM public.timeline_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  legal_rows := legal_rows + affected;

  DELETE FROM public.notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  notification_rows := notification_rows + affected;

  DELETE FROM public.execution_files WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  legal_rows := legal_rows + affected;

  DELETE FROM public.lawsuit_files WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  legal_rows := legal_rows + affected;

  DELETE FROM public.criminal_case_ownership WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  legal_rows := legal_rows + affected;

  DELETE FROM public.global_notes WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  legal_rows := legal_rows + affected;

  DELETE FROM public.lawyer_settings WHERE user_key = uid_text;
  GET DIAGNOSTICS settings_rows = ROW_COUNT;

  DELETE FROM public.calendar_tombstones WHERE user_id = p_user_id;
  GET DIAGNOSTICS calendar_rows = ROW_COUNT;

  DELETE FROM public.lawyer_shell_notification_events WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  notification_rows := notification_rows + affected;

  DELETE FROM public.lawyer_shell_notifications WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  notification_rows := notification_rows + affected;

  DELETE FROM public.case_shares
  WHERE owner_id = p_user_id OR recipient_id = p_user_id;
  GET DIAGNOSTICS sharing_rows = ROW_COUNT;

  DELETE FROM public.forum_comment_reports WHERE reporter_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_reports WHERE reporter_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_bookmarks WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_comment_upvotes WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_post_subscriptions WHERE user_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_group_members WHERE lawyer_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_follows
  WHERE follower_id = p_user_id OR following_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_mutes
  WHERE muter_id = p_user_id OR muted_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_comments WHERE author_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  DELETE FROM public.forum_posts WHERE author_id = p_user_id;
  GET DIAGNOSTICS affected = ROW_COUNT;
  forum_rows := forum_rows + affected;

  UPDATE public.forum_posts
  SET upvoter_ids = array_remove(upvoter_ids, p_user_id),
      updated_at = now()
  WHERE p_user_id = ANY(upvoter_ids);
  GET DIAGNOSTICS sanitized_forum_rows = ROW_COUNT;

  DELETE FROM public.kv_store_f09713ba
  WHERE
    key LIKE ('user:' || uid_text || ':%')
    OR key LIKE ('calendar:' || uid_text || ':%')
    OR key LIKE ('lawyer_files:' || uid_text || ':%')
    OR key LIKE ('urgentActions:' || uid_text || ':%')
    OR key LIKE ('transactions:' || uid_text || ':%')
    OR key LIKE ('transactionsThreading:' || uid_text || ':%')
    OR key LIKE ('notifications:' || uid_text || ':%')
    OR key LIKE ('vault:docs:' || uid_text || ':%')
    OR key LIKE ('follow:' || uid_text || ':%')
        OR key LIKE ('follow:%:' || uid_text)
    OR key = ('notifications_' || uid_text)
    OR key = ('hami:push:' || uid_text)
    OR key = ('hami:calendar:events:' || uid_text || ':v1')
    OR key = ('profile:' || uid_text)
    OR (
      key LIKE 'community:posts:%'
      AND COALESCE(
        to_jsonb(value) ->> 'authorId',
        to_jsonb(value) ->> 'author_id',
        ''
      ) = uid_text
    )
    OR (
      key LIKE 'community:reports:%'
      AND COALESCE(to_jsonb(value) ->> 'reporterId', '') = uid_text
        )
        OR (
          key LIKE 'repository:docs:%'
          AND COALESCE(
            to_jsonb(value) ->> 'authorId',
            to_jsonb(value) ->> 'author_id',
            ''
          ) = uid_text
    );
  GET DIAGNOSTICS legacy_kv_rows = ROW_COUNT;

  RETURN jsonb_build_object(
    'legalRows', legal_rows,
    'settingsRows', settings_rows,
    'notificationRows', notification_rows,
    'forumRows', forum_rows,
    'sharingRows', sharing_rows,
    'calendarRows', calendar_rows,
    'legacyKvRows', legacy_kv_rows,
    'sanitizedForumRows', sanitized_forum_rows,
    'totalDeleted',
      legal_rows
      + settings_rows
      + notification_rows
      + forum_rows
      + sharing_rows
      + calendar_rows
      + legacy_kv_rows
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wipe_user_application_data(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wipe_user_application_data(uuid)
TO service_role;
