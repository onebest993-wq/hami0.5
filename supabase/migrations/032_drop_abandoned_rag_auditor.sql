-- إسقاط بقايا RAG غير المستخدمة وإيقاف كرون المدقق اليومي المهجور.
-- لا يمس جدول notifications الحيّ ولا مسار التمييز داخل الإضبارة.

DROP TABLE IF EXISTS public.cassation_decisions CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND to_regclass('cron.job') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'daily_auditor_3am_baghdad';
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_function THEN NULL;
  WHEN insufficient_privilege THEN NULL;
END $$;

DROP FUNCTION IF EXISTS public.schedule_daily_auditor_job(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.unschedule_daily_auditor_job();
