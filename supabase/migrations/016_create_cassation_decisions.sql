-- قرارات تمييزية (نص فقط — بلا متجهات)
CREATE TABLE IF NOT EXISTS public.cassation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_number TEXT NOT NULL,
  decision_date DATE NOT NULL,
  court_name TEXT NOT NULL,
  legal_principle TEXT NOT NULL,
  full_text TEXT NOT NULL,
  related_article TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS cassation_decisions_number_date_uidx
  ON public.cassation_decisions (decision_number, decision_date);

CREATE INDEX IF NOT EXISTS cassation_decisions_decision_date_idx
  ON public.cassation_decisions (decision_date DESC);

ALTER TABLE public.cassation_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cassation_decisions_select_public ON public.cassation_decisions;
CREATE POLICY cassation_decisions_select_public
  ON public.cassation_decisions FOR SELECT
  TO anon, authenticated
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON public.cassation_decisions FROM anon, authenticated;

COMMENT ON TABLE public.cassation_decisions IS 'قرارات تمييزية — نص مرجعي فقط';
