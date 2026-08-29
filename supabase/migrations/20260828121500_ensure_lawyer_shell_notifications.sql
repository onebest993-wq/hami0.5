-- 027/028 سُجّلتا في schema_migrations دون بقاء الجداول على المشروع الحي.
-- CREATE IF NOT EXISTS يعيد صندوق الجرس دون كسر البيئات التي تملكه أصلاً.

CREATE TABLE IF NOT EXISTS public.lawyer_shell_notifications (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    category TEXT,
    direction TEXT NOT NULL DEFAULT 'incoming',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    dedupe_key TEXT,
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS lawyer_shell_notifications_user_created_idx
    ON public.lawyer_shell_notifications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS lawyer_shell_notifications_user_dedupe_uidx
    ON public.lawyer_shell_notifications (user_id, dedupe_key)
    WHERE dedupe_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lawyer_shell_notification_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'read', 'read_all', 'merged')),
    dedupe_key TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lawyer_shell_notification_events_user_created_idx
    ON public.lawyer_shell_notification_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS lawyer_shell_notification_events_user_notif_idx
    ON public.lawyer_shell_notification_events (user_id, notification_id, created_at DESC);

ALTER TABLE public.lawyer_shell_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_shell_notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lawyer_shell_notifications_select_own ON public.lawyer_shell_notifications;
CREATE POLICY lawyer_shell_notifications_select_own
    ON public.lawyer_shell_notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS lawyer_shell_notification_events_select_own ON public.lawyer_shell_notification_events;
CREATE POLICY lawyer_shell_notification_events_select_own
    ON public.lawyer_shell_notification_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP VIEW IF EXISTS public.lawyer_shell_notification_inbox_v;
CREATE VIEW public.lawyer_shell_notification_inbox_v
WITH (security_invoker = true) AS
SELECT
    user_id,
    id,
    title,
    message,
    notification_type,
    category,
    direction,
    is_read,
    dedupe_key,
    action_payload,
    created_at,
    updated_at
FROM public.lawyer_shell_notifications
ORDER BY created_at DESC;

COMMENT ON TABLE public.lawyer_shell_notifications IS 'Inbox موحّد للجرس — مصدر الحالة الحالية';
COMMENT ON TABLE public.lawyer_shell_notification_events IS 'سجل append-only لأحداث الإشعارات (created/read/merged)';
COMMENT ON VIEW public.lawyer_shell_notification_inbox_v IS 'عرض inbox الجرس — security_invoker حتى لا يتجاوز RLS';

REVOKE ALL ON TABLE public.lawyer_shell_notifications FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.lawyer_shell_notification_events FROM PUBLIC, anon;
REVOKE ALL ON public.lawyer_shell_notification_inbox_v FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.lawyer_shell_notifications TO authenticated;
GRANT SELECT ON TABLE public.lawyer_shell_notification_events TO authenticated;
GRANT SELECT ON public.lawyer_shell_notification_inbox_v TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawyer_shell_notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawyer_shell_notification_events TO service_role;
GRANT SELECT ON public.lawyer_shell_notification_inbox_v TO service_role;

CREATE OR REPLACE FUNCTION public.rebuild_lawyer_shell_inbox_from_events(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    v_inserted integer := 0;
    v_read_all_at timestamptz;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN 0;
    END IF;

    DELETE FROM public.lawyer_shell_notifications WHERE user_id = p_user_id;

    INSERT INTO public.lawyer_shell_notifications (
        user_id,
        id,
        title,
        message,
        notification_type,
        category,
        direction,
        is_read,
        dedupe_key,
        action_payload,
        created_at,
        updated_at
    )
    SELECT
        p_user_id,
        notification_id,
        COALESCE(payload #>> '{notification,title}', payload ->> 'title', 'إشعار'),
        COALESCE(payload #>> '{notification,message}', payload ->> 'message', ''),
        COALESCE(payload #>> '{notification,type}', payload ->> 'type', 'system_alert'),
        NULLIF(payload #>> '{notification,category}', ''),
        COALESCE(NULLIF(payload #>> '{notification,direction}', ''), 'incoming'),
        false,
        dedupe_key,
        COALESCE(payload -> 'notification' -> 'actionPayload', payload -> 'actionPayload', '{}'::jsonb),
        created_at,
        created_at
    FROM (
        SELECT DISTINCT ON (notification_id)
            notification_id,
            dedupe_key,
            payload,
            created_at
        FROM public.lawyer_shell_notification_events
        WHERE user_id = p_user_id
          AND event_type IN ('created', 'updated')
          AND (
              payload ? 'notification'
              OR payload ? 'title'
          )
        ORDER BY notification_id, created_at DESC
    ) latest;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    SELECT MAX(created_at)
    INTO v_read_all_at
    FROM public.lawyer_shell_notification_events
    WHERE user_id = p_user_id
      AND event_type = 'read_all';

    IF v_read_all_at IS NOT NULL THEN
        UPDATE public.lawyer_shell_notifications
        SET is_read = true, updated_at = GREATEST(updated_at, v_read_all_at)
        WHERE user_id = p_user_id;
    END IF;

    UPDATE public.lawyer_shell_notifications n
    SET is_read = true,
        updated_at = GREATEST(n.updated_at, r.last_read_at)
    FROM (
        SELECT notification_id, MAX(created_at) AS last_read_at
        FROM public.lawyer_shell_notification_events
        WHERE user_id = p_user_id
          AND event_type = 'read'
          AND notification_id <> '*'
        GROUP BY notification_id
    ) r
    WHERE n.user_id = p_user_id
      AND n.id = r.notification_id
      AND (v_read_all_at IS NULL OR r.last_read_at > v_read_all_at OR n.updated_at <= v_read_all_at);

    RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_lawyer_shell_inbox_from_events(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rebuild_lawyer_shell_inbox_from_events(uuid) TO service_role;

COMMENT ON FUNCTION public.rebuild_lawyer_shell_inbox_from_events IS
    'يُعيد بناء lawyer_shell_notifications من event log — للصيانة فقط (service role)';
