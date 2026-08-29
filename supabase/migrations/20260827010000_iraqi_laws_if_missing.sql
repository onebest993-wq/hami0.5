-- جدول مواد القوانين — كان مسجّلاً في 002 لكن غائباً عن السحابة.
-- بدون هذا الجدول تبويب المقر «القوانين» يقرأ فراغاً ويفشل الإدخال.

CREATE TABLE IF NOT EXISTS public.iraqi_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_name TEXT NOT NULL,
  article_number TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS iraqi_laws_law_article_uidx
  ON public.iraqi_laws (law_name, article_number);

ALTER TABLE public.iraqi_laws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "iraqi_laws_select_public" ON public.iraqi_laws;
CREATE POLICY "iraqi_laws_select_public"
  ON public.iraqi_laws FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.iraqi_laws IS 'مواد تشريعية عراقية';

REVOKE ALL ON TABLE public.iraqi_laws FROM PUBLIC;
GRANT SELECT ON TABLE public.iraqi_laws TO anon, authenticated;
GRANT ALL ON TABLE public.iraqi_laws TO service_role;
