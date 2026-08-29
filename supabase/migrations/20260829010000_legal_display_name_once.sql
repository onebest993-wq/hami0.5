-- Canonical legal display name: seeded at signup, correctable once, frozen on client UPDATE.
-- Previous name stays on the row for HQ; the app hides it after 30 days.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legal_display_name text,
  ADD COLUMN IF NOT EXISTS previous_legal_display_name text,
  ADD COLUMN IF NOT EXISTS legal_display_name_corrections smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legal_display_name_corrected_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_legal_display_name_corrections_range;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_legal_display_name_corrections_range
  CHECK (legal_display_name_corrections >= 0 AND legal_display_name_corrections <= 1);

COMMENT ON COLUMN public.profiles.legal_display_name IS
  'Canonical tripartite display name. Client cannot UPDATE this column.';
COMMENT ON COLUMN public.profiles.previous_legal_display_name IS
  'Name before the single allowed correction. HQ keeps it; UI hides after 30 days.';
COMMENT ON COLUMN public.profiles.legal_display_name_corrections IS
  '0 = never corrected, 1 = the one allowed correction was used.';

UPDATE public.profiles p
SET legal_display_name = left(trim(both from COALESCE(u.raw_user_meta_data ->> 'fullName', '')), 80)
FROM auth.users u
WHERE p.id = u.id
  AND (p.legal_display_name IS NULL OR btrim(p.legal_display_name) = '')
  AND btrim(COALESCE(u.raw_user_meta_data ->> 'fullName', '')) <> '';

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
    AND is_active IS NOT DISTINCT FROM (SELECT p.is_active FROM public.profiles p WHERE p.id = auth.uid())
    AND is_deleted IS NOT DISTINCT FROM (SELECT p.is_deleted FROM public.profiles p WHERE p.id = auth.uid())
    AND deleted_at IS NOT DISTINCT FROM (SELECT p.deleted_at FROM public.profiles p WHERE p.id = auth.uid())
    AND freeze_until IS NOT DISTINCT FROM (SELECT p.freeze_until FROM public.profiles p WHERE p.id = auth.uid())
    AND login_blocked IS NOT DISTINCT FROM (SELECT p.login_blocked FROM public.profiles p WHERE p.id = auth.uid())
    AND login_until IS NOT DISTINCT FROM (SELECT p.login_until FROM public.profiles p WHERE p.id = auth.uid())
    AND public_verified_badge IS NOT DISTINCT FROM (
      SELECT p.public_verified_badge FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND legal_display_name IS NOT DISTINCT FROM (
      SELECT p.legal_display_name FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND previous_legal_display_name IS NOT DISTINCT FROM (
      SELECT p.previous_legal_display_name FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND legal_display_name_corrections IS NOT DISTINCT FROM (
      SELECT p.legal_display_name_corrections FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND legal_display_name_corrected_at IS NOT DISTINCT FROM (
      SELECT p.legal_display_name_corrected_at FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND COALESCE(status, '') IS NOT DISTINCT FROM COALESCE(
      (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid()),
      ''
    )
  );

CREATE OR REPLACE FUNCTION public.enforce_legal_display_name_once()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  old_name text;
  new_name text;
  corrections smallint;
  canonical text;
BEGIN
  new_name := NULLIF(
    left(trim(both from regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'fullName', ''), '\s+', ' ', 'g')), 80),
    ''
  );

  IF TG_OP = 'INSERT' THEN
    IF new_name IS NOT NULL THEN
      INSERT INTO public.profiles (id, role, legal_display_name)
      VALUES (
        NEW.id,
        CASE
          WHEN lower(trim(both from COALESCE(NEW.raw_user_meta_data ->> 'accountType', 'lawyer'))) = 'client'
            THEN 'client'
          ELSE 'lawyer'
        END,
        new_name
      )
      ON CONFLICT (id) DO UPDATE
        SET legal_display_name = COALESCE(NULLIF(btrim(public.profiles.legal_display_name), ''), EXCLUDED.legal_display_name)
        WHERE public.profiles.legal_display_name IS NULL OR btrim(public.profiles.legal_display_name) = '';
    END IF;
    RETURN NEW;
  END IF;

  old_name := NULLIF(
    left(trim(both from regexp_replace(COALESCE(OLD.raw_user_meta_data ->> 'fullName', ''), '\s+', ' ', 'g')), 80),
    ''
  );

  IF new_name IS NOT NULL
     AND NEW.raw_user_meta_data ->> 'fullName' IS DISTINCT FROM new_name THEN
    NEW.raw_user_meta_data := jsonb_set(COALESCE(NEW.raw_user_meta_data, '{}'::jsonb), '{fullName}', to_jsonb(new_name));
  END IF;

  IF new_name IS NOT DISTINCT FROM old_name THEN
    RETURN NEW;
  END IF;

  SELECT p.legal_display_name_corrections, NULLIF(btrim(p.legal_display_name), '')
    INTO corrections, canonical
  FROM public.profiles p
  WHERE p.id = NEW.id;

  IF NOT FOUND THEN
    corrections := 0;
    canonical := NULL;
  END IF;
  corrections := COALESCE(corrections, 0);

  IF canonical IS NULL AND new_name IS NOT NULL THEN
    UPDATE public.profiles
      SET legal_display_name = new_name, updated_at = now()
      WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF new_name IS NULL THEN
    NEW.raw_user_meta_data := jsonb_set(
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      '{fullName}',
      to_jsonb(COALESCE(canonical, old_name, ''))
    );
    RETURN NEW;
  END IF;

  IF corrections >= 1 THEN
    NEW.raw_user_meta_data := jsonb_set(
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      '{fullName}',
      to_jsonb(COALESCE(canonical, old_name, new_name))
    );
    RETURN NEW;
  END IF;

  UPDATE public.profiles
    SET previous_legal_display_name = COALESCE(canonical, old_name),
        legal_display_name = new_name,
        legal_display_name_corrections = 1,
        legal_display_name_corrected_at = now(),
        updated_at = now()
    WHERE id = NEW.id;

  INSERT INTO public.audit_logs (user_id, action, details)
  VALUES (
    NEW.id,
    'hq:user.display_name_correct',
    jsonb_build_object(
      'targetId', NEW.id::text,
      'from', COALESCE(canonical, old_name, ''),
      'to', new_name
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_zz_legal_display_name_once ON auth.users;
CREATE TRIGGER trg_zz_legal_display_name_once
  BEFORE INSERT OR UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_legal_display_name_once();
