-- =====================================================
-- WIFE 2.0 Backend Signature Verification (Supabase / Postgres)
-- تاريخ الإنشاء: 23 أبريل 2026
-- =====================================================

-- Ensure crypto helpers are available for HMAC.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------
-- Private secret storage (Supabase-safe alternative)
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.wife_secrets (
  key text PRIMARY KEY,
  secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SECURITY NOTE:
-- Legacy hardcoded seed was intentionally removed.
-- Secrets must be provisioned through secure runtime/vault process only.
-- Example (run manually in controlled environment):
-- INSERT INTO private.wife_secrets (key, secret)
-- VALUES ('wife_hmac_secret', '<ROTATED_SECRET_FROM_VAULT>')
-- ON CONFLICT (key)
-- DO UPDATE SET secret = EXCLUDED.secret, updated_at = now();

-- Keep schema/table hidden from API roles.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE private.wife_secrets FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------
-- verify_wife_signature()
-- -----------------------------------------------------
-- تتحقق من:
-- 1) وجود الرؤوس الأمنية المطلوبة
-- 2) أن timestamp ضمن نافذة 60 ثانية (مع سماحية بسيطة لانحراف الساعة)
-- 3) صحة HMAC-SHA256 للتوقيع
--
-- السر يتم قراءته من private.wife_secrets
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_wife_signature()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private, extensions
AS $$
DECLARE
  headers_json jsonb;
  signature_header text;
  timestamp_header text;
  nonce_header text;
  wife_secret text;

  request_ts timestamptz;
  now_ts timestamptz := statement_timestamp();
  age_seconds numeric;

  message_to_sign text;
  expected_signature text;
BEGIN
  -- Read request headers once. If unavailable, fail closed.
  headers_json := COALESCE(current_setting('request.headers', true), '{}')::jsonb;

  -- PostgREST عادةً يخزن المفاتيح lowercase، لذلك نقرأ lowercase مع fallback.
  signature_header := COALESCE(
    headers_json ->> 'x-wife-signature',
    headers_json ->> 'X-WIFE-Signature'
  );
  timestamp_header := COALESCE(
    headers_json ->> 'x-wife-timestamp',
    headers_json ->> 'X-WIFE-Timestamp'
  );
  nonce_header := COALESCE(
    headers_json ->> 'x-wife-nonce',
    headers_json ->> 'X-WIFE-Nonce'
  );

  IF signature_header IS NULL OR timestamp_header IS NULL OR nonce_header IS NULL THEN
    RETURN false;
  END IF;

  SELECT ws.secret
    INTO wife_secret
  FROM private.wife_secrets ws
  WHERE ws.key = 'wife_hmac_secret'
  LIMIT 1;

  IF wife_secret IS NULL OR wife_secret = '' THEN
    RETURN false;
  END IF;

  -- Parse timestamp:
  -- - 13 digits: epoch milliseconds
  -- - 10 digits: epoch seconds
  -- - otherwise: ISO-8601 timestamp string
  BEGIN
    IF timestamp_header ~ '^\d{13}$' THEN
      request_ts := to_timestamp((timestamp_header::numeric / 1000)::double precision);
    ELSIF timestamp_header ~ '^\d{10}$' THEN
      request_ts := to_timestamp(timestamp_header::double precision);
    ELSE
      request_ts := timestamp_header::timestamptz;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;

  age_seconds := EXTRACT(EPOCH FROM (now_ts - request_ts));

  -- Reject too old (>60s) or too far in future (<-5s).
  IF age_seconds > 60 OR age_seconds < -5 THEN
    RETURN false;
  END IF;

  -- Signing format: "{timestamp}.{nonce}"
  -- Must match frontend WIFE 2.0 signing format exactly.
  message_to_sign := timestamp_header || '.' || nonce_header;

  expected_signature := encode(
    extensions.hmac(
      convert_to(message_to_sign, 'UTF8'),
      convert_to(wife_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  -- Accept both raw hex and "sha256=<hex>" format.
  signature_header := lower(regexp_replace(signature_header, '^sha256=', ''));

  RETURN signature_header = expected_signature;
END;
$$;

COMMENT ON FUNCTION public.verify_wife_signature()
IS 'Verifies WIFE 2.0 request signature from request headers with 60-second freshness window.';

-- =====================================================
-- RLS Template (apply per table)
-- =====================================================
/*
-- 1) Enable RLS on target table
ALTER TABLE public.<your_table> ENABLE ROW LEVEL SECURITY;

-- 2) SELECT policy template
CREATE POLICY "<your_table>_wife_select"
  ON public.<your_table>
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.verify_wife_signature())
    AND <your_existing_select_condition>
  );

-- 3) INSERT policy template
CREATE POLICY "<your_table>_wife_insert"
  ON public.<your_table>
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT public.verify_wife_signature())
    AND <your_existing_insert_condition>
  );

-- 4) UPDATE policy template
CREATE POLICY "<your_table>_wife_update"
  ON public.<your_table>
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT public.verify_wife_signature())
    AND <your_existing_update_using_condition>
  )
  WITH CHECK (
    (SELECT public.verify_wife_signature())
    AND <your_existing_update_check_condition>
  );

-- 5) DELETE policy template
CREATE POLICY "<your_table>_wife_delete"
  ON public.<your_table>
  FOR DELETE
  TO authenticated
  USING (
    (SELECT public.verify_wife_signature())
    AND <your_existing_delete_condition>
  );
*/

-- =====================================================
-- KV Store RLS — ربط كل صف بصاحبه عبر مفتاح prefixed
-- =====================================================
-- جدول kv_store_f09713ba هو مخزن key-value عام.
-- سياسة RLS تعتمد على أن الـ key يبدأ بـ "user:{auth.uid()}:"
-- لكل صف يخص مستخدم معين.
-- الصفوف التي لا تبدأ بـ "user:" (مثل community post) لها سياسة منفصلة.
-- =====================================================

ALTER TABLE public.kv_store_f09713ba ENABLE ROW LEVEL SECURITY;

-- 1) SELECT: المستخدم يرى فقط صفوفه + صفوف المجتمع العامة
CREATE POLICY "kv_store_select_own_or_public"
  ON public.kv_store_f09713ba
  FOR SELECT
  TO authenticated
  USING (
    key IS NOT NULL
    AND (
      -- صفوف المستخدم: key يبدأ بـ user:{uid}:
      key LIKE 'user:' || auth.uid() || ':%'
      OR
      -- صفوف المجتمع (عامة للقراءة): key يبدأ بـ community:
      key LIKE 'community:%'
    )
  );

-- 2) INSERT: المستخدم يُدرج فقط صفوفاً تخصه
CREATE POLICY "kv_store_insert_own"
  ON public.kv_store_f09713ba
  FOR INSERT
  TO authenticated
  WITH CHECK (
    key IS NOT NULL
    AND (
      -- صفوف المستخدم
      key LIKE 'user:' || auth.uid() || ':%'
      OR
      -- صفوف المجتمع (أي مستخدم مسجل يمكنه النشر)
      key LIKE 'community:%'
    )
  );

-- 3) UPDATE: المستخدم يُحدث فقط صفوفه
CREATE POLICY "kv_store_update_own"
  ON public.kv_store_f09713ba
  FOR UPDATE
  TO authenticated
  USING (
    key IS NOT NULL
    AND key LIKE 'user:' || auth.uid() || ':%'
  )
  WITH CHECK (
    key IS NOT NULL
    AND key LIKE 'user:' || auth.uid() || ':%'
  );

-- 4) DELETE: المستخدم يحذف فقط صفوفه
CREATE POLICY "kv_store_delete_own"
  ON public.kv_store_f09713ba
  FOR DELETE
  TO authenticated
  USING (
    key IS NOT NULL
    AND key LIKE 'user:' || auth.uid() || ':%'
  );

-- =====================================================
-- ملاحظات أمنية:
-- =====================================================
-- 1. صفوف المجتمع (community:*) قابلة للقراءة والكتابة
--    من قبل أي مستخدم مسجل. هذا مقصود لميزة المجتمع.
-- 2. صفوف المستخدم (user:{uid}:*) مقيدة تماماً بـ auth.uid().
--    لا يمكن لأي مستخدم آخر قراءة أو تعديل أو حذف هذه الصفوف.
-- 3. RLS لا تنطبق على الـ service_role key — فقط على
--    anon key و authenticated key من العميل.
-- 4. إذا كان هناك حاجة لصفوف "عامة" غير community:prefix،
--    أضفها إلى سياسات SELECT/INSERT مع شرط إضافي.
-- =====================================================
