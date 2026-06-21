-- مشاركة إضبارات بين المحامين مع قناع خصوصية
CREATE TABLE IF NOT EXISTS public.case_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dossier_module TEXT NOT NULL CHECK (dossier_module IN ('execution', 'lawsuit', 'criminal', 'personal')),
    dossier_id TEXT NOT NULL,
    dossier_title TEXT NOT NULL DEFAULT '',
    visible_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    masked_view JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_case_shares_recipient ON public.case_shares(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_shares_owner ON public.case_shares(owner_id, created_at DESC);

ALTER TABLE public.case_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY case_shares_owner_select ON public.case_shares
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY case_shares_recipient_select ON public.case_shares
    FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY case_shares_owner_insert ON public.case_shares
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY case_shares_recipient_update ON public.case_shares
    FOR UPDATE USING (auth.uid() = recipient_id);
