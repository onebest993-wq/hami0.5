CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    execution_id UUID NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'info',
    notification_key TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'execution_files'
    ) THEN
        ALTER TABLE public.notifications
            DROP CONSTRAINT IF EXISTS notifications_execution_id_fkey;
        ALTER TABLE public.notifications
            ADD CONSTRAINT notifications_execution_id_fkey
            FOREIGN KEY (execution_id)
            REFERENCES public.execution_files(id)
            ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
    ON public.notifications (user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_key_uidx
    ON public.notifications (user_id, notification_key)
    WHERE notification_key IS NOT NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DO $$
DECLARE
    project_url TEXT := current_setting('app.settings.supabase_url', true);
    anon_key TEXT := current_setting('app.settings.anon_key', true);
BEGIN
    IF project_url IS NULL OR anon_key IS NULL THEN
        RAISE NOTICE 'Skipping cron schedule because app.settings.supabase_url or app.settings.anon_key is missing.';
        RETURN;
    END IF;

    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily_auditor_3am_baghdad';

    PERFORM cron.schedule(
        'daily_auditor_3am_baghdad',
        '0 0 * * *',
        format(
            $job$
            SELECT
                net.http_post(
                    url := '%s/functions/v1/daily-auditor',
                    headers := jsonb_build_object(
                        'Content-Type', 'application/json',
                        'apikey', '%s',
                        'Authorization', 'Bearer %s'
                    ),
                    body := '{"trigger":"cron"}'::jsonb
                );
            $job$,
            project_url,
            anon_key,
            anon_key
        )
    );
END $$;

COMMENT ON TABLE public.notifications IS 'System notifications for proactive legal monitoring.';
COMMENT ON COLUMN public.notifications.notification_key IS 'Idempotency key used by background auditors.';
