-- Bootstrap public.profiles + auth triggers (idempotent).
-- No dependency on kv_store_* or store_products.
-- Safe to re-run before freeze_profile_ban_flags migration.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'lawyer'
    CHECK (role IN ('lawyer', 'client', 'admin', 'moderator')),
  is_banned boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  status text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Temporary update policy (freeze migration replaces WITH CHECK to lock ban flags)
DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.strip_privileged_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned jsonb;
  k text;
  allowed text[] := ARRAY['fullName', 'phone', 'avatar_url', 'familyName', 'governorate', 'lawyerBarRoom', 'verificationStatus'];
  safe_meta jsonb := '{}'::jsonb;
  acct text;
  vstatus text;
BEGIN
  cleaned := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  FOREACH k IN ARRAY allowed LOOP
    IF cleaned ? k THEN
      safe_meta := safe_meta || jsonb_build_object(k, cleaned -> k);
    END IF;
  END LOOP;

  acct := lower(trim(both from COALESCE(cleaned ->> 'accountType', 'lawyer')));
  IF acct IN ('lawyer', 'client') THEN
    safe_meta := safe_meta || jsonb_build_object('accountType', acct);
  ELSE
    safe_meta := safe_meta || jsonb_build_object('accountType', 'lawyer');
  END IF;

  vstatus := lower(trim(both from COALESCE(cleaned ->> 'verificationStatus', '')));
  IF vstatus IN ('pending', 'active', 'rejected') THEN
    safe_meta := safe_meta || jsonb_build_object('verificationStatus', vstatus);
  END IF;

  NEW.raw_user_meta_data := safe_meta;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_strip_privileged_user_metadata ON auth.users;
CREATE TRIGGER trg_strip_privileged_user_metadata
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_privileged_user_metadata();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (
    NEW.id,
    CASE
      WHEN lower(trim(both from COALESCE(NEW.raw_user_meta_data ->> 'accountType', 'lawyer'))) = 'client'
        THEN 'client'
      ELSE 'lawyer'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_auth_user_profile ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user_profile();

-- Backfill existing auth users
INSERT INTO public.profiles (id, role)
SELECT u.id, 'lawyer'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_forum_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'moderator')
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_deleted, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND COALESCE(p.is_banned, false) = false
      AND COALESCE(p.is_deleted, false) = false
  );
$$;

-- Optional: store catalog policies only if table exists
DO $$
BEGIN
  IF to_regclass('public.store_products') IS NULL THEN
    RAISE NOTICE 'store_products missing — skip admin store policies';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Admin insert store products" ON public.store_products';
  EXECUTE 'DROP POLICY IF EXISTS "Admin update store products" ON public.store_products';
  EXECUTE 'DROP POLICY IF EXISTS "Admin delete store products" ON public.store_products';

  EXECUTE $p$
    CREATE POLICY "Admin insert store products"
      ON public.store_products FOR INSERT TO authenticated
      WITH CHECK (public.is_platform_admin())
  $p$;
  EXECUTE $p$
    CREATE POLICY "Admin update store products"
      ON public.store_products FOR UPDATE TO authenticated
      USING (public.is_platform_admin())
      WITH CHECK (public.is_platform_admin())
  $p$;
  EXECUTE $p$
    CREATE POLICY "Admin delete store products"
      ON public.store_products FOR DELETE TO authenticated
      USING (public.is_platform_admin())
  $p$;
END $$;
