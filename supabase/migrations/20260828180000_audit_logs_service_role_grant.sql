-- سجل عمليات المقر يُقرأ ويُكتب من BFF بـ service_role فقط.
-- الجدول أُنشئ بلا GRANT فظهر «تعذّر تحميل سجل العمليات» رغم أن الجدول حيّ.

REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO service_role;
GRANT ALL ON TABLE public.audit_logs TO postgres;
