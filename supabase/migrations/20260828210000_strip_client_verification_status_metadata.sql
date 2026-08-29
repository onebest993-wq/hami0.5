-- JWT verificationStatus is not a privilege source. Never copy it from NEW.
-- On UPDATE, keep the previous value. HQ KYC authority remains KV.

CREATE OR REPLACE FUNCTION public.strip_privileged_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  cleaned jsonb;
  k text;
  allowed text[] := ARRAY['fullName', 'phone', 'avatar_url', 'familyName', 'governorate', 'lawyerBarRoom'];
  safe_meta jsonb := '{}'::jsonb;
  acct text;
  old_vstatus text;
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

  IF TG_OP = 'UPDATE' THEN
    old_vstatus := lower(trim(both from COALESCE(OLD.raw_user_meta_data ->> 'verificationStatus', '')));
    IF old_vstatus IN ('pending', 'active', 'rejected') THEN
      safe_meta := safe_meta || jsonb_build_object('verificationStatus', old_vstatus);
    END IF;
  END IF;

  NEW.raw_user_meta_data := safe_meta;
  RETURN NEW;
END;
$function$;
