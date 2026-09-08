-- سدّ ثغرات تغطية kv_store في wipe_user_application_data.
--
-- الدالة كانت تحذف أربع عشرة عائلة مفاتيح وتترك ثلاثاً. جرد كل نداءات
-- `kvSet` / `serverKvSet` في `src/app/api` و`src/app/services` أعطى:
--
--   lawyer-verification:   src/app/api/auth/signup/route.ts:287        غير مغطّاة
--   task_help:*            src/app/services/taskHelp/taskHelpRepository.ts:76-86  غير مغطّاة
--   case_share:*           src/app/services/caseShare/caseShareRepository.ts:103-105  غير مغطّاة
--
-- الأخطر بينها الأولى: `lawyer-verification:<uid>` تحمل صورة بطاقة الهوية
-- الحكومية بوجهيها وصورة الوجه. المحامي الذي يضغط «احذف حسابي» أو «امسح كل
-- بياناتي» يبقى معتقداً أنها زالت — وهي باقية إلى الأبد في جدول مشترك، ويتيتّم
-- سجلّها عن أي حساب بعد حذف مستخدم GoTrue فيستحيل العثور عليه لاحقاً بمعرّف
-- المستخدم. في منتج تُقاس ثقته كلّها بالتعامل مع وثائق الهوية، هذه ليست ثغرة
-- تنظيف بل ثغرة امتثال.
--
-- ⚠️ شكل المفتاح حاسم: `lawyer-verification:<uid>` بلا نقطتين بعد المعرّف،
-- بخلاف كل أخواته في هذه الدالة. فالنمط المتوقَّع على غرارها:
--     key LIKE ('lawyer-verification:' || uid_text || ':%')   ← لا يطابق شيئاً
-- والصحيح مساواة:
--     key = ('lawyer-verification:' || uid_text)              ← ✅
--
-- بقية الدالة منسوخة حرفياً من 20260829130636 بلا أي تغيير؛ الإضافة محصورة في
-- كتلة kv_store وحدها، وعدّاد legacy_kv_rows يلتقطها تلقائياً.

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

  IF to_regclass('public.lawyer_work_checkpoints') IS NOT NULL THEN
    DELETE FROM public.lawyer_work_checkpoints WHERE user_id = p_user_id;
  END IF;

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
    OR key LIKE ('repository:docs:' || uid_text || ':%')
    OR key LIKE ('follow:' || uid_text || ':%')
    OR key LIKE ('follow:%:' || uid_text)
    OR key LIKE ('followers:' || uid_text || ':%')
    OR (
      split_part(key, ':', 1) = 'followers'
      AND split_part(key, ':', 3) = uid_text
    )
    OR key = ('notifications_' || uid_text)
    OR key = ('hami:push:' || uid_text)
    OR key = ('hami:calendar:events:' || uid_text || ':v1')
    OR key = ('profile:' || uid_text)

    -- ▼▼ الإضافة: ثلاث عائلات كانت خارج التغطية ▼▼

    -- ١) وثائق التحقق من الهوية — صورتا البطاقة الحكومية وصورة الوجه.
    --    مساواة لا LIKE: المفتاح `lawyer-verification:<uid>` بلا لاحقة.
    OR key = ('lawyer-verification:' || uid_text)

    -- ٢) مشاركة القضايا في kv_store. جدول case_shares يُحذف أعلاه من الطرفين،
    --    وهذه نسخته في KV فتتبع القاعدة نفسها.
    OR key LIKE ('case_share:owner:' || uid_text || ':%')
    OR key LIKE ('case_share:recipient:' || uid_text || ':%')
    OR (
      key LIKE 'case_share:%'
      AND key NOT LIKE 'case_share:owner:%'
      AND key NOT LIKE 'case_share:recipient:%'
      AND COALESCE(
        to_jsonb(value) ->> 'ownerId',
        ''
      ) = uid_text
    )
    OR (
      key LIKE 'case_share:%'
      AND key NOT LIKE 'case_share:owner:%'
      AND key NOT LIKE 'case_share:recipient:%'
      AND COALESCE(
        to_jsonb(value) ->> 'recipientId',
        ''
      ) = uid_text
    )

    -- ٣) طلبات مساعدة المهام. الفهارس الثلاثة تُحذف أياً كان دور المستخدم،
    --    أمّا السجلّ نفسه فيُحذف حين يكون هو الطالب — أي مالك البيانات.
    --    سجلّ طلبه زميل وكان هذا المستخدم منفّذاً له يبقى لصاحبه (حذفه يمحو
    --    بيانات طرف آخر)، ويفقد فهرسه هنا. الأثر المتبقّي: معرّف المستخدم قد
    --    يبقى داخل حقل assigneeId في سجلّ زميله — يحتاج قرار سياسة، ولم أُدرجه
    --    لأن تعديله يمسّ بيانات مستخدم آخر بلا إذن.
    OR key LIKE ('task_help:requester:' || uid_text || ':%')
    OR key LIKE ('task_help:assignee:' || uid_text || ':%')
    OR key LIKE ('task_help:recipient:' || uid_text || ':%')
    OR (
      key LIKE 'task_help:%'
      AND key NOT LIKE 'task_help:requester:%'
      AND key NOT LIKE 'task_help:assignee:%'
      AND key NOT LIKE 'task_help:recipient:%'
      AND key NOT LIKE 'task_help:open:%'
      AND COALESCE(
        to_jsonb(value) ->> 'requesterId',
        ''
      ) = uid_text
    )

    -- ▲▲ نهاية الإضافة ▲▲

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

-- فحص الإثبات بعد التطبيق، على حساب اختباري:
--
--   SELECT count(*) FROM public.kv_store_f09713ba
--   WHERE key = 'lawyer-verification:<uid>'
--      OR key LIKE 'task_help:%' || '<uid>' || '%'
--      OR key LIKE 'case_share:%' || '<uid>' || '%';
--   -- قبل الحذف > 0، وبعده = 0
