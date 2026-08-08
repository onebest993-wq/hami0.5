-- إعدادات التطبيق السحابية (مسار dev_user للتطوير)
CREATE TABLE IF NOT EXISTS public.lawyer_settings (
    user_key text PRIMARY KEY,
    app_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lawyer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lawyer_settings_dev_user_all ON public.lawyer_settings;

CREATE POLICY lawyer_settings_dev_user_all
    ON public.lawyer_settings
    FOR ALL
    TO anon, authenticated
    USING (user_key = 'dev_user')
    WITH CHECK (user_key = 'dev_user');
