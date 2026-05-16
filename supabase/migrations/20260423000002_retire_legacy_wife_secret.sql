-- Retire legacy DB-level WIFE secret artifacts.
-- This migration removes stale secret material introduced by older migrations.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'private'
      AND table_name = 'wife_secrets'
  ) THEN
    DELETE FROM private.wife_secrets
    WHERE key = 'wife_hmac_secret';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.verify_wife_signature();

