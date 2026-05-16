CREATE OR REPLACE FUNCTION public.schedule_daily_auditor_job(
    project_url TEXT,
    anon_key TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF project_url IS NULL OR btrim(project_url) = '' THEN
        RAISE EXCEPTION 'project_url is required';
    END IF;
    IF anon_key IS NULL OR btrim(anon_key) = '' THEN
        RAISE EXCEPTION 'anon_key is required';
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

CREATE OR REPLACE FUNCTION public.unschedule_daily_auditor_job()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily_auditor_3am_baghdad';
$$;

COMMENT ON FUNCTION public.schedule_daily_auditor_job(TEXT, TEXT)
IS 'Schedules daily-auditor at 03:00 Baghdad (00:00 UTC).';

COMMENT ON FUNCTION public.unschedule_daily_auditor_job()
IS 'Removes daily-auditor cron job if exists.';
