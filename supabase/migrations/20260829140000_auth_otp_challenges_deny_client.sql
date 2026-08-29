-- رفض صريح لـ anon/authenticated فوق REVOKE (الخدمة تتجاوز RLS).
-- يُغلق تحذير rls_enabled_no_policy دون فتح أي مسار عميل.

DROP POLICY IF EXISTS auth_otp_challenges_no_client ON public.auth_otp_challenges;

CREATE POLICY auth_otp_challenges_no_client
  ON public.auth_otp_challenges
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
