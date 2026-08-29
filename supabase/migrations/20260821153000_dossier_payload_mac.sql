-- HMAC اختياري للحمولة المشفّرة: يكتبه BFF عند وجود HAMI_DOSSIER_PAYLOAD_MAC_SECRET.
ALTER TABLE public.execution_files
  ADD COLUMN IF NOT EXISTS payload_mac text;

ALTER TABLE public.lawsuit_files
  ADD COLUMN IF NOT EXISTS payload_mac text;

COMMENT ON COLUMN public.execution_files.payload_mac IS 'HMAC-SHA256(encrypted_data) بمفتاح خادمي — اختياري';
COMMENT ON COLUMN public.lawsuit_files.payload_mac IS 'HMAC-SHA256(encrypted_data) بمفتاح خادمي — اختياري';
