-- =====================================================
-- Admin HQ: OTP challenges + trusted devices (service_role / BFF only)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  device_fingerprint text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  request_ip text
);

CREATE INDEX IF NOT EXISTS idx_admin_otp_challenges_user_open
  ON public.admin_otp_challenges (user_id, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS public.admin_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  label text,
  trusted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_active
  ON public.admin_trusted_devices (user_id, device_fingerprint)
  WHERE revoked_at IS NULL;

ALTER TABLE public.admin_otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_trusted_devices ENABLE ROW LEVEL SECURITY;

-- No direct client policies — BFF uses service_role only
REVOKE ALL ON TABLE public.admin_otp_challenges FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_trusted_devices FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_otp_challenges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_trusted_devices TO service_role;
