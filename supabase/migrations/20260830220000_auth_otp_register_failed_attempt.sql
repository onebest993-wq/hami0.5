-- زيادة محاولات OTP ذرّياً على الخادم حتى لا يتجاوز طلبان متزامنان سقف المحاولات.

CREATE OR REPLACE FUNCTION public.auth_otp_register_failed_attempt(p_id uuid, p_max integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_attempts integer;
  new_consumed timestamptz;
  now_ts timestamptz := now();
BEGIN
  IF p_max IS NULL OR p_max < 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.auth_otp_challenges
  SET
    attempts = attempts + 1,
    consumed_at = CASE
      WHEN attempts + 1 >= p_max THEN now_ts
      ELSE consumed_at
    END
  WHERE id = p_id
    AND consumed_at IS NULL
    AND expires_at > now_ts
  RETURNING attempts, consumed_at INTO new_attempts, new_consumed;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'attempts', new_attempts,
    'locked', new_consumed IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.auth_otp_register_failed_attempt(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_otp_register_failed_attempt(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.auth_otp_register_failed_attempt(uuid, integer) IS
  'Atomically increment OTP challenge attempts and lock at p_max. service_role / BFF only.';
