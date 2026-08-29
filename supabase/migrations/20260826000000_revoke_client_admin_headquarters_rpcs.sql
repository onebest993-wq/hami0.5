-- مقر القيادة عن بعد: إزالة RPCs من PostgREST بالكامل.
-- التحكم يتم عبر BFF (service_role على profiles + GoTrue) بعد بوابة
-- Wife + مدير منصّة + جهاز OTP موثّق. لا EXECUTE للمتصفح.

DROP FUNCTION IF EXISTS public.admin_list_users();
DROP FUNCTION IF EXISTS public.admin_toggle_user_status(uuid);
DROP FUNCTION IF EXISTS public.admin_change_user_role(uuid, text);
