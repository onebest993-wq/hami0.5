-- إضبارات الدعاوى على السحابة: الجدول غير موجود على hami 0.5 رغم تسجيل 001.
-- يطابق مسار BFF: upsert/list/delete على (user_id, external_id).
-- parent_id نصّي لأن BFF يمرّر معرّف التطبيق لا uuid الصف.

CREATE TABLE IF NOT EXISTS public.lawsuit_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    external_id text NOT NULL,
    case_no text NOT NULL,
    court text NOT NULL,
    stage text NOT NULL,
    case_type text,
    parent_id text,
    encrypted_data text NOT NULL,
    data_signature text NOT NULL,
    security_version integer NOT NULL DEFAULT 3,
    status text NOT NULL DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lawsuit_files_user_external_id_unique UNIQUE (user_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_lawsuit_files_user
  ON public.lawsuit_files (user_id);

CREATE INDEX IF NOT EXISTS idx_lawsuit_files_user_updated
  ON public.lawsuit_files (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_lawsuit_files_case_no
  ON public.lawsuit_files (case_no);

DROP TRIGGER IF EXISTS update_lawsuit_files_updated_at ON public.lawsuit_files;
CREATE TRIGGER update_lawsuit_files_updated_at
  BEFORE UPDATE ON public.lawsuit_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lawsuit_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lawsuit_files_select_own" ON public.lawsuit_files;
DROP POLICY IF EXISTS "lawsuit_files_insert_own" ON public.lawsuit_files;
DROP POLICY IF EXISTS "lawsuit_files_update_own" ON public.lawsuit_files;
DROP POLICY IF EXISTS "lawsuit_files_delete_own" ON public.lawsuit_files;

CREATE POLICY "lawsuit_files_select_own"
    ON public.lawsuit_files FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "lawsuit_files_insert_own"
    ON public.lawsuit_files FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lawsuit_files_update_own"
    ON public.lawsuit_files FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lawsuit_files_delete_own"
    ON public.lawsuit_files FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.lawsuit_files IS 'ملفات الدعاوى السحابية — حمولة مشفّرة ومقيدة بالمالك';
COMMENT ON COLUMN public.lawsuit_files.data_signature IS 'SHA-256(encrypted_data) — يُرفض عند عدم المطابقة في BFF';
