-- رموز التحقق للمحامي: استعادة كلمة المرور وتأكيد البريد (بريد / واتساب)
-- service_role / BFF فقط — بلا سياسات عميل.

CREATE TABLE IF NOT EXISTS public.auth_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('password_reset', 'email_confirm')),
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  request_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_challenges_open
  ON public.auth_otp_challenges (user_id, purpose, created_at DESC)
  WHERE consumed_at IS NULL;

ALTER TABLE public.auth_otp_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_otp_challenges FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_otp_challenges TO service_role;

COMMENT ON TABLE public.auth_otp_challenges IS
  'OTP hashed challenges for lawyer password reset and email confirm. BFF/service_role only.';
