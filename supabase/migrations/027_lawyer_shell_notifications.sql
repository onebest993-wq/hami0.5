-- Lawyer shell notifications (bell / NotificationPanel) — منفصل عن public.notifications (execution auditor)
-- inbox حالي + event log append-only للتدقيق والمزامنة multi-device

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

-- الكتابة عبر service role (BFF) فقط — لا INSERT/UPDATE للـ authenticated

CREATE OR REPLACE VIEW public.lawyer_shell_notification_inbox_v AS
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
