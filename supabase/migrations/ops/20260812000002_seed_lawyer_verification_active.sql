-- Grants + KV store bootstrap + seed lawyer-verification:active for eligible profiles.
-- Runs as DB owner via supabase db query --linked (not JS client).

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.profiles TO service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO postgres;

CREATE TABLE IF NOT EXISTS public.kv_store_f09713ba (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.kv_store_f09713ba ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.kv_store_f09713ba TO service_role;
GRANT ALL ON TABLE public.kv_store_f09713ba TO postgres;

-- Seed / upgrade verification records for active lawyers/mods/admins
WITH eligible AS (
  SELECT id::text AS user_id
  FROM public.profiles
  WHERE role IN ('lawyer', 'moderator', 'admin')
    AND COALESCE(is_banned, false) = false
    AND COALESCE(is_active, true) = true
    AND COALESCE(is_deleted, false) = false
),
existing AS (
  SELECT e.user_id,
         k.value AS old_value,
         COALESCE(k.value ->> 'status', '') AS old_status
  FROM eligible e
  LEFT JOIN public.kv_store_f09713ba k
    ON k.key = 'lawyer-verification:' || e.user_id
)
INSERT INTO public.kv_store_f09713ba (key, value)
SELECT
  'lawyer-verification:' || user_id,
  jsonb_strip_nulls(
    COALESCE(old_value, '{}'::jsonb)
    || jsonb_build_object(
      'userId', user_id,
      'status', 'active',
      'updatedAt', to_jsonb(now()::text),
      'submittedAt', COALESCE(old_value -> 'submittedAt', to_jsonb(now()::text)),
      'migratedBy', 'ops_sql_lawyer_verification_active',
      'migratedAt', to_jsonb(now()::text)
    )
  )
FROM existing
WHERE old_status IS DISTINCT FROM 'rejected'
  AND old_status IS DISTINCT FROM 'active'
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value
WHERE COALESCE(public.kv_store_f09713ba.value ->> 'status', '') IS DISTINCT FROM 'rejected'
  AND COALESCE(public.kv_store_f09713ba.value ->> 'status', '') IS DISTINCT FROM 'active';

-- Report
SELECT
  (SELECT count(*) FROM public.profiles) AS profiles_total,
  (SELECT count(*) FROM public.kv_store_f09713ba WHERE key LIKE 'lawyer-verification:%') AS verification_keys,
  (SELECT count(*) FROM public.kv_store_f09713ba WHERE key LIKE 'lawyer-verification:%' AND value ->> 'status' = 'active') AS verification_active;
