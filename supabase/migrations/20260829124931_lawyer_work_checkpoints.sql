-- نقطة حفظ مشفّرة لآخر مزامنة عمل ناجحة. BFF + service_role فقط.
-- النسخة تطابق الهجرة المطبّقة على hami 0.5 (20260829124931).

CREATE TABLE IF NOT EXISTS public.lawyer_work_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  encrypted_data text NOT NULL,
  data_signature text NOT NULL,
  security_version int NOT NULL DEFAULT 3
);

CREATE INDEX IF NOT EXISTS lawyer_work_checkpoints_user_created_idx
  ON public.lawyer_work_checkpoints (user_id, created_at DESC);

ALTER TABLE public.lawyer_work_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_work_checkpoints FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_clients_lawyer_work_checkpoints ON public.lawyer_work_checkpoints;
CREATE POLICY deny_clients_lawyer_work_checkpoints
  ON public.lawyer_work_checkpoints
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON TABLE public.lawyer_work_checkpoints FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lawyer_work_checkpoints TO service_role;
GRANT ALL ON TABLE public.lawyer_work_checkpoints TO postgres;

COMMENT ON TABLE public.lawyer_work_checkpoints IS
  'آخر نقاط عمل مشفّرة للعميل — ليست سجل إصدارات عام';
