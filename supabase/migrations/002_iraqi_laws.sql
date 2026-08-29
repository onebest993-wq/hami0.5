-- جدول نصوص القوانين العراقية (نص فقط — بلا متجهات)
CREATE TABLE IF NOT EXISTS iraqi_laws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_name TEXT NOT NULL,
  article_number TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS iraqi_laws_law_article_uidx
  ON iraqi_laws (law_name, article_number);

ALTER TABLE iraqi_laws ENABLE ROW LEVEL SECURITY;

-- قراءة عامة للمرجع القانوني (التعديل عبر service role / الدالة فقط)
CREATE POLICY "iraqi_laws_select_public"
  ON iraqi_laws FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE iraqi_laws IS 'مواد تشريعية عراقية';
