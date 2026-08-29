/**
 * Security Initializer
 * تهيئة وتفعيل جميع أنظمة الأمان
 * @version 2.0.0
 */

import { useEffect } from 'react';
import { supabase } from '@/app/lib/supabase-client';
import '@/app/services/SecurityAuditService';
import { installWifeFetchGuard } from '@/app/security/wifeFetchGuard';
import {
  clearCsrfSessionToken,
} from '@/app/security/csrfSession';
import { ensureCsrfSessionReady, invalidateCsrfSessionReady } from '@/app/security/ensureCsrfSessionReady';
import { shouldUseServerSignedAuth } from '@/app/utils/authStorage';
import { isBffAuthEnabled, runBffLocalAuthMigration } from '@/app/utils/bffAuthClient';

async function revokeCsrfSession(): Promise<void> {
  try {
    const { wasCsrfServerSessionEstablished } = await import('@/app/security/ensureCsrfSessionReady');
    if (!wasCsrfServerSessionEstablished()) {
      clearCsrfSessionToken();
      return;
    }
    const { SecureAPIClient, getCurrentAccessToken } = await import('@/app/services/SecureAPIClient');
    const accessToken = await getCurrentAccessToken();
    if (shouldUseServerSignedAuth(accessToken)) {
      await SecureAPIClient.fetchSecure('/api/security/csrf', { method: 'DELETE' });
    }
  } catch {
    /* best effort */
  }
  clearCsrfSessionToken();
}

/**
 * Security Initializer Component
 * يتم استدعاؤه مرة واحدة عند بدء التطبيق
 */
export function SecurityInitializer(): null {
  useEffect(() => {
    installWifeFetchGuard();
    if (__HAMI_CLIENT_PRODUCT__ !== 'hq') {
      void import('@/app/security/lawyerLocalOnlyBoot').then((m) =>
        m.installLawyerLocalOnlyIsolation(),
      );
    }
    if (isBffAuthEnabled()) {
      void runBffLocalAuthMigration();
    }

    let authUnsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const { data } = supabase.auth.onAuthStateChange((event: string, session: { access_token?: string } | null) => {
          if (event === 'SIGNED_OUT') {
            invalidateCsrfSessionReady();
            void revokeCsrfSession();
            return;
          }
          // لا نعيد إصدار CSRF عند TOKEN_REFRESHED — يمنع 403 أثناء الجلسة
          if (event === 'SIGNED_IN' && session?.access_token) {
            void ensureCsrfSessionReady({ force: true });
          }
        });
        authUnsubscribe = () => data.subscription.unsubscribe();
      } catch {
        /* best effort */
      }
    })();

    return () => {
      authUnsubscribe?.();
    };
  }, []);

  return null;
}
