-- دليل المقر: صفحة من الخادم بدل إنزال الآلاف + هويات الصفحة عبر service_role فقط.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_hq_created_at
  ON public.profiles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_hq_role_created_at
  ON public.profiles (role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_legal_display_name
  ON public.profiles (legal_display_name);

CREATE INDEX IF NOT EXISTS idx_kv_lawyer_verification_status
  ON public.kv_store_f09713ba ((value ->> 'status'))
  WHERE key LIKE 'lawyer-verification:%';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_legal_display_name_trgm ON public.profiles USING gin (legal_display_name gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_previous_legal_display_name_trgm ON public.profiles USING gin (previous_legal_display_name gin_trgm_ops)';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.hq_lookup_auth_email(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE lower(u.email) = lower(btrim(p_email))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.hq_lookup_auth_phone(p_phone text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT u.id
  FROM auth.users u
  WHERE btrim(COALESCE(u.phone, '')) = btrim(p_phone)
     OR btrim(COALESCE(u.raw_user_meta_data ->> 'phone', '')) = btrim(p_phone)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.hq_directory_identities(p_ids uuid[])
RETURNS TABLE (
  id uuid,
  email text,
  phone text,
  family_name text,
  governorate text,
  lawyer_bar_room text,
  app_verification_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT
    u.id,
    u.email::text,
    COALESCE(NULLIF(btrim(u.phone), ''), NULLIF(btrim(u.raw_user_meta_data ->> 'phone'), '')),
    COALESCE(
      NULLIF(btrim(u.raw_user_meta_data ->> 'familyName'), ''),
      NULLIF(btrim(u.raw_user_meta_data ->> 'family_name'), '')
    ),
    NULLIF(btrim(u.raw_user_meta_data ->> 'governorate'), ''),
    COALESCE(
      NULLIF(btrim(u.raw_user_meta_data ->> 'lawyerBarRoom'), ''),
      NULLIF(btrim(u.raw_user_meta_data ->> 'lawyer_bar_room'), '')
    ),
    NULLIF(btrim(u.raw_app_meta_data ->> 'verification_status'), '')
  FROM auth.users u
  WHERE u.id = ANY (p_ids)
    AND COALESCE(cardinality(p_ids), 0) <= 50
    AND COALESCE(cardinality(p_ids), 0) > 0;
$$;

REVOKE ALL ON FUNCTION public.hq_lookup_auth_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_lookup_auth_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.hq_lookup_auth_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_lookup_auth_email(text) TO service_role;

REVOKE ALL ON FUNCTION public.hq_lookup_auth_phone(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_lookup_auth_phone(text) FROM anon;
REVOKE ALL ON FUNCTION public.hq_lookup_auth_phone(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_lookup_auth_phone(text) TO service_role;

REVOKE ALL ON FUNCTION public.hq_directory_identities(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hq_directory_identities(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.hq_directory_identities(uuid[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.hq_directory_identities(uuid[]) TO service_role;

COMMENT ON FUNCTION public.hq_lookup_auth_email(text) IS
  'HQ BFF email lookup — EXECUTE granted to service_role only';
COMMENT ON FUNCTION public.hq_lookup_auth_phone(text) IS
  'HQ BFF phone lookup — EXECUTE granted to service_role only';
COMMENT ON FUNCTION public.hq_directory_identities(uuid[]) IS
  'HQ BFF directory page identities — EXECUTE granted to service_role only, max 50 ids';
