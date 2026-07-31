-- =====================================================
-- منتدى المحامين — كتم المستخدمين (server-side mute)
-- يُدار عبر BFF + service_role فقط (كسائر جداول المنتدى)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.forum_mutes (
  muter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (muter_id, muted_id),
  CONSTRAINT forum_mutes_no_self CHECK (muter_id <> muted_id)
);

CREATE INDEX IF NOT EXISTS idx_forum_mutes_muter ON public.forum_mutes (muter_id, created_at DESC);

ALTER TABLE public.forum_mutes ENABLE ROW LEVEL SECURITY;

-- الوصول عبر service_role فقط — لا وصول مباشر من العميل
DROP POLICY IF EXISTS forum_mutes_select ON public.forum_mutes;
CREATE POLICY forum_mutes_select ON public.forum_mutes
  FOR SELECT TO authenticated USING (false);

DROP POLICY IF EXISTS forum_mutes_insert ON public.forum_mutes;
CREATE POLICY forum_mutes_insert ON public.forum_mutes
  FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS forum_mutes_delete ON public.forum_mutes;
CREATE POLICY forum_mutes_delete ON public.forum_mutes
  FOR DELETE TO authenticated USING (false);
