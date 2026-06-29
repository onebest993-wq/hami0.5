-- إعادة بناء inbox من event log (صيانة / تعافي بعد تعارض)

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

COMMENT ON FUNCTION public.rebuild_lawyer_shell_inbox_from_events IS
    'يُعيد بناء lawyer_shell_notifications من event log — للصيانة فقط (service role)';
