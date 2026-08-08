-- مزامنة إعدادات المحامي: صف لكل مستخدم مصادق (auth.uid)
-- يحل محل سياسة dev_user المشتركة

DROP POLICY IF EXISTS lawyer_settings_dev_user_all ON public.lawyer_settings;

DROP POLICY IF EXISTS lawyer_settings_own_select ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_insert ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_update ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_own_delete ON public.lawyer_settings;
DROP POLICY IF EXISTS lawyer_settings_dev_fallback ON public.lawyer_settings;

CREATE POLICY lawyer_settings_own_select
    ON public.lawyer_settings
    FOR SELECT
    TO authenticated
    USING (user_key = auth.uid()::text);

CREATE POLICY lawyer_settings_own_insert
    ON public.lawyer_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (user_key = auth.uid()::text);

CREATE POLICY lawyer_settings_own_update
    ON public.lawyer_settings
    FOR UPDATE
    TO authenticated
    USING (user_key = auth.uid()::text)
    WITH CHECK (user_key = auth.uid()::text);

CREATE POLICY lawyer_settings_own_delete
    ON public.lawyer_settings
    FOR DELETE
    TO authenticated
    USING (user_key = auth.uid()::text);

-- احتياطي للتطوير القديم (anon بدون جلسة حقيقية)
CREATE POLICY lawyer_settings_dev_fallback
    ON public.lawyer_settings
    FOR ALL
    TO anon
    USING (user_key = 'dev_user')
    WITH CHECK (user_key = 'dev_user');
