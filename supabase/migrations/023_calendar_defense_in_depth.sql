-- =====================================================
-- التقويم: Defence-in-Depth — RLS كامل على مفاتيح KV الخاصة
--
-- السياق:
-- الـ kv-proxy يستخدم SERVICE_ROLE (يتجاوز RLS) ويعتمد على whitelist
-- يدوي في الـ Edge Function لتحديد ملكية المفتاح. هذا "single point
-- of failure". هذا الـ migration يُضيف RLS صريح لكل المفاتيح الخاصة
-- بحيث لو فشل الـ whitelist أو حاول مهاجم استخدام anon JWT للوصول
-- المباشر → RLS تحجبه على مستوى DB.
--
-- ⚠️ تنبيه: يجب تطبيق هذا الـ migration:
--   supabase db push
-- أو psql -f 023_calendar_defense_in_depth.sql
-- =====================================================

-- -----------------------------------------------------
-- 1) إسقاط السياسات الضيّقة السابقة (سنوسّعها)
-- -----------------------------------------------------
DROP POLICY IF EXISTS "kv_store_select_own_or_public" ON public.kv_store_f09713ba;
DROP POLICY IF EXISTS "kv_store_insert_own"           ON public.kv_store_f09713ba;
DROP POLICY IF EXISTS "kv_store_update_own"           ON public.kv_store_f09713ba;
DROP POLICY IF EXISTS "kv_store_delete_own"           ON public.kv_store_f09713ba;

-- -----------------------------------------------------
-- 2) دالة مساعِدة: هل المفتاح يخصّ المستخدم الحالي؟
--    قائمة موسّعة تغطي كل أنماط المفاتيح الخاصة الفعلية.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.kv_key_belongs_to_user(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p_key IS NOT NULL
    AND (
      p_key LIKE 'user:'                  || auth.uid() || ':%'
      OR p_key LIKE 'calendar:'           || auth.uid() || ':%'
      OR p_key LIKE 'lawyer_files:'       || auth.uid() || ':%'
      OR p_key LIKE 'urgentActions:'      || auth.uid() || ':%'
      OR p_key LIKE 'transactions:'       || auth.uid() || ':%'
      OR p_key LIKE 'transactionsThreading:' || auth.uid() || ':%'
      OR p_key LIKE 'notifications:'      || auth.uid() || ':%'
      OR p_key =    'notifications_'      || auth.uid()
      OR p_key LIKE 'vault:docs:'         || auth.uid() || ':%'
      OR p_key =    'hami:push:'          || auth.uid()
      OR p_key =    'hami:calendar:events:' || auth.uid() || ':v1'
      OR p_key LIKE 'follow:'             || auth.uid() || ':%'
    );
$$;

-- -----------------------------------------------------
-- 3) سياسات RLS الجديدة — defence-in-depth
-- -----------------------------------------------------

-- SELECT: المستخدم يرى صفوفه الخاصة + محتوى المجتمع العام
CREATE POLICY "kv_store_select_own_v2"
  ON public.kv_store_f09713ba
  FOR SELECT
  TO authenticated
  USING (
    public.kv_key_belongs_to_user(key)
    OR key LIKE 'community:%'
    OR key LIKE 'banned:users:%'
    OR key LIKE 'repository:docs:%'
    OR key LIKE 'follow:%'   -- العلاقات الاجتماعية مرئية عامّةً
  );

-- INSERT: لا يكتب إلا صفوفاً تخصه (لا يُسمح بكتابة المجتمع مباشرةً)
CREATE POLICY "kv_store_insert_own_v2"
  ON public.kv_store_f09713ba
  FOR INSERT
  TO authenticated
  WITH CHECK ( public.kv_key_belongs_to_user(key) );

-- UPDATE
CREATE POLICY "kv_store_update_own_v2"
  ON public.kv_store_f09713ba
  FOR UPDATE
  TO authenticated
  USING ( public.kv_key_belongs_to_user(key) )
  WITH CHECK ( public.kv_key_belongs_to_user(key) );

-- DELETE
CREATE POLICY "kv_store_delete_own_v2"
  ON public.kv_store_f09713ba
  FOR DELETE
  TO authenticated
  USING ( public.kv_key_belongs_to_user(key) );

-- -----------------------------------------------------
-- 4) Tombstones — حلّ مشكلة "deletion resurrection"
--    عندما يحذف الجهاز A حدثاً ثم الجهاز B (وفيه نسخة محلية قديمة) يُزامن.
--    بدون tombstones، الـ merge يُعيد إحياء الحدث.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_tombstones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    TEXT NOT NULL,
  deleted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_calendar_tombstones_user_id_deleted_at
  ON public.calendar_tombstones (user_id, deleted_at DESC);

ALTER TABLE public.calendar_tombstones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_tombstones_select_own" ON public.calendar_tombstones;
DROP POLICY IF EXISTS "calendar_tombstones_insert_own" ON public.calendar_tombstones;
DROP POLICY IF EXISTS "calendar_tombstones_delete_own" ON public.calendar_tombstones;

CREATE POLICY "calendar_tombstones_select_own"
  ON public.calendar_tombstones FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "calendar_tombstones_insert_own"
  ON public.calendar_tombstones FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- لا يحق للمستخدم تعديل tombstone (audit trail)
-- يحق له فقط حذفه (مثلاً عند restore)

CREATE POLICY "calendar_tombstones_delete_own"
  ON public.calendar_tombstones FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- تنظيف tombstones قديمة (> 90 يوماً) — مفيد لقاعدة نظيفة
CREATE OR REPLACE FUNCTION public.cleanup_old_calendar_tombstones()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH del AS (
    DELETE FROM public.calendar_tombstones
    WHERE deleted_at < NOW() - INTERVAL '90 days'
    RETURNING 1
  )
  SELECT COUNT(*)::INTEGER FROM del;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_calendar_tombstones() TO authenticated;

-- -----------------------------------------------------
-- 5) ملاحظة للمشغّل:
--    تأكد من وجود معرّف publication supabase_realtime لو أردت
--    أن تستفيد من Realtime على calendar_tombstones (اختياري).
-- -----------------------------------------------------
