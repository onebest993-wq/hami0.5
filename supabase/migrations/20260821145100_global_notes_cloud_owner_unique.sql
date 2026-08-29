-- ملاحظات عامة على السحابة: الجدول غير موجود على hami 0.5 رغم تسجيل 001.
-- يطابق مسار BFF: upsert/list/delete على (user_id, external_id).

CREATE TABLE IF NOT EXISTS public.global_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    external_id text NOT NULL,
    title text,
    content text NOT NULL,
    category text,
    tags text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT global_notes_user_external_id_unique UNIQUE (user_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_global_notes_user
  ON public.global_notes (user_id);

CREATE INDEX IF NOT EXISTS idx_global_notes_user_updated
  ON public.global_notes (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_global_notes_updated_at ON public.global_notes;
CREATE TRIGGER update_global_notes_updated_at
  BEFORE UPDATE ON public.global_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.global_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "global_notes_select_own" ON public.global_notes;
DROP POLICY IF EXISTS "global_notes_insert_own" ON public.global_notes;
DROP POLICY IF EXISTS "global_notes_update_own" ON public.global_notes;
DROP POLICY IF EXISTS "global_notes_delete_own" ON public.global_notes;

CREATE POLICY "global_notes_select_own"
    ON public.global_notes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "global_notes_insert_own"
    ON public.global_notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "global_notes_update_own"
    ON public.global_notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "global_notes_delete_own"
    ON public.global_notes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.global_notes IS 'ملاحظات عامة سحابية — مقيدة بالمالك';
