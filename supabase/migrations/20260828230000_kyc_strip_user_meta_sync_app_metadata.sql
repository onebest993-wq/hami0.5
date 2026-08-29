-- JWT user_metadata.verificationStatus is client-writable and must not stick after HQ KYC.
-- Never copy it from NEW or preserve OLD. HQ authority remains KV.
-- Cache for UX only: raw_app_meta_data.verification_status (not an RLS privilege source).

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

  NEW.raw_user_meta_data := safe_meta;
  RETURN NEW;
END;
$function$;

-- Drop leftover JWT user_metadata KYC (any UPDATE fires the strip function).
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
WHERE raw_user_meta_data ? 'verificationStatus';

-- Mirror KV KYC into app_metadata so a session refresh can catch up without trusting user_metadata.
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('verification_status', lower(trim(both from kv.value->>'status')))
FROM public.kv_store_f09713ba kv
WHERE kv.key = 'lawyer-verification:' || u.id::text
  AND lower(trim(both from COALESCE(kv.value->>'status', ''))) IN ('pending', 'active', 'rejected');
