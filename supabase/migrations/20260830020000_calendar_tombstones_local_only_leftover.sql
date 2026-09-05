-- التقويم صار محلياً مشفّراً. هذا الجدول بقايا مسار BFF القديم.
-- لا يُحذف: دوال المسح (wipe_user_application_data) ما زالت DELETE منه.
-- يُغلق وصول العميل المتبقي من 023 (سياسات permissive تُضعف deny_clients).

DROP POLICY IF EXISTS "calendar_tombstones_select_own" ON public.calendar_tombstones;
DROP POLICY IF EXISTS "calendar_tombstones_insert_own" ON public.calendar_tombstones;
DROP POLICY IF EXISTS "calendar_tombstones_delete_own" ON public.calendar_tombstones;

DROP POLICY IF EXISTS deny_clients_calendar_tombstones ON public.calendar_tombstones;
CREATE POLICY deny_clients_calendar_tombstones
  ON public.calendar_tombstones
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.calendar_tombstones IS
  'بقايا شواهد حذف تقويم سحابية — التطبيق لا يقرأ/يكتب هنا؛ المسح الإداري فقط. الجدول الحي: SecureStore hami:calendar:tombstones:v1';

DO $$
BEGIN
  IF to_regprocedure('public.cleanup_old_calendar_tombstones()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.cleanup_old_calendar_tombstones() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.cleanup_old_calendar_tombstones() FROM anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.cleanup_old_calendar_tombstones() TO service_role;
  END IF;
END $$;
