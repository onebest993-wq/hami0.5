/**
 * Security Initializer
 * تهيئة وتفعيل جميع أنظمة الأمان
 * @version 2.0.0
 */

import { useEffect } from 'react';
import { rateLimitService } from '@/app/services/RateLimitService';
import { securityAudit } from '@/app/services/SecurityAuditService';
import { installWifeFetchGuard } from '@/app/security/wifeFetchGuard';
import {
  applyCsrfTokenToDocument,
  clearCsrfSessionToken,
  getOrCreateCsrfSessionToken,
  setCsrfSessionTokenFromServer,
} from '@/app/security/csrfSession';
import { shouldUseServerSignedAuth } from '@/app/utils/authStorage';
import { debug } from '@/app/utils/debug';
import { isBffAuthEnabled, runBffLocalAuthMigration } from '@/app/utils/bffAuthClient';

async function revokeCsrfSession(): Promise<void> {
  try {
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

let csrfBootstrapInFlight: Promise<void> | null = null;

async function bootstrapCsrfSession(): Promise<void> {
  if (csrfBootstrapInFlight) return csrfBootstrapInFlight;
  csrfBootstrapInFlight = (async () => {
    try {
      const { getCurrentAccessToken } = await import('@/app/services/SecureAPIClient');
      const accessToken = await getCurrentAccessToken();
      if (!shouldUseServerSignedAuth(accessToken)) {
        const token = getOrCreateCsrfSessionToken();
        applyCsrfTokenToDocument(token);
        return;
      }
      const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
      const res = await SecureAPIClient.fetchSecure<{ ok?: boolean; csrfToken?: string }>(
        '/api/security/csrf',
        { method: 'GET' },
      );
      if (res?.ok && res?.csrfToken) {
        setCsrfSessionTokenFromServer(res.csrfToken);
        return;
      }
    } catch {
      /* fallback to client-only CSRF in dev / offline */
    }
    const token = getOrCreateCsrfSessionToken();
    applyCsrfTokenToDocument(token);
  })().finally(() => {
    csrfBootstrapInFlight = null;
  });
  return csrfBootstrapInFlight;
}

/**
 * Security Initializer Component
 * يتم استدعاؤه مرة واحدة عند بدء التطبيق
 */
export function SecurityInitializer(): null {
  useEffect(() => {
    installWifeFetchGuard();
    if (isBffAuthEnabled()) {
      void runBffLocalAuthMigration();
    }
    void bootstrapCsrfSession();

    rateLimitService.configure('api', {
      maxRequests: 100,
      windowMs: 60 * 1000,
      blockDurationMs: 5 * 60 * 1000,
    });

    rateLimitService.configure('auth', {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 30 * 60 * 1000,
    });

    const unsubscribeAudit = securityAudit.subscribe((event) => {
      if (event.severity === 'critical') {
        debug.error('[Security Alert]', event.message, event.details);
      } else if (event.severity === 'high') {
        debug.warn('[Security Alert]', event.message, event.details);
      }
    });

    let authUnsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        const { supabase } = await import('@/app/lib/supabase-client');
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            void revokeCsrfSession();
            return;
          }
          // لا نعيد إصدار CSRF عند TOKEN_REFRESHED — يمنع 403 أثناء الجلسة
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.access_token) {
            void bootstrapCsrfSession();
          }
        });
        authUnsubscribe = () => data.subscription.unsubscribe();
      } catch {
        /* best effort */
      }
    })();

    const runDeferredBoot = () => {
      securityAudit.performHealthCheck().then((health) => {
        if (!health.healthy && import.meta.env.DEV) {
          debug.warn('[Security] System health issues:', health.issues);
        }
      });

      securityAudit.logEvent(
        'data',
        'low',
        'Application started',
        {
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
        }
      );
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(runDeferredBoot, { timeout: 2000 });
      return () => {
        cancelIdleCallback(idleId);
        unsubscribeAudit();
        authUnsubscribe?.();
      };
    }

    const bootTimer = window.setTimeout(runDeferredBoot, 100);

    return () => {
      window.clearTimeout(bootTimer);
      unsubscribeAudit();
      authUnsubscribe?.();
    };
  }, []);

  return null;
}
