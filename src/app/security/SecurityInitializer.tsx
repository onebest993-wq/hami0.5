/**
 * Security Initializer
 * تهيئة وتفعيل جميع أنظمة الأمان
 * @version 1.0.0
 */

import { useEffect, type ComponentType } from 'react';
import { rateLimitService } from '@/app/services/RateLimitService';
import { inputSanitizer } from '@/app/services/InputSanitizerService';
import { securityAudit } from '@/app/services/SecurityAuditService';

/**
 * Security Initializer Component
 * يتم استدعاؤه مرة واحدة عند بدء التطبيق
 */
export function SecurityInitializer(): null {
  useEffect(() => {
    // تكوين Rate Limiting
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

    // الاشتراك في أحداث الأمان الحرجة
    const unsubscribe = securityAudit.subscribe((event) => {
      if (event.severity === 'critical' || event.severity === 'high') {
        console.error('[Security Alert]', event.message, event.details);
      }
    });

    const runDeferredBoot = () => {
      securityAudit.performHealthCheck().then((health) => {
        if (!health.healthy) {
          console.warn('[Security] System health issues:', health.issues);
          securityAudit.logEvent(
            'data',
            'high',
            'System health check failed',
            { issues: health.issues }
          );
        } else if (import.meta.env.DEV) {
          console.log('[Security] System health check passed ✅');
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

      void injectCsrfToken();
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(runDeferredBoot, { timeout: 4000 });
      return () => {
        cancelIdleCallback(idleId);
        unsubscribe();
      };
    }

    const bootTimer = window.setTimeout(runDeferredBoot, 300);

    return () => {
      window.clearTimeout(bootTimer);
      unsubscribe();
    };
  }, []);

  return null; // هذا component لا يعرض شيء
}

async function injectCsrfToken(): Promise<void> {
  try {
    const { supabase } = await import('@/app/lib/supabase-client');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    const { createCsrfToken } = await import('@/app/api/security/csrfToken');
    const csrfToken = await createCsrfToken(session.access_token);

    // Set as meta tag for easy client access
    let meta = document.querySelector('meta[name="x-csrf-token"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'x-csrf-token');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', csrfToken);

    // Also set as a same-site cookie (used by server-side double-submit pattern)
    const cookieName = 'hami_csrf_token';
    document.cookie = `${cookieName}=${csrfToken}; path=/; samesite=strict; max-age=${60 * 60 * 24}`;
  } catch {
    // CSRF meta injection is best-effort; failure shouldn't block app startup
  }
}

/**
 * useSecurityMiddleware Hook
 * للاستخدام في المكونات التي تحتاج حماية
 */
export function useSecurityMiddleware() {
  /**
   * التحقق من Rate Limit
   */
  const checkRateLimit = (operation: string, identifier: string): boolean => {
    const allowed = rateLimitService.check(operation, identifier);
    
    if (!allowed) {
      securityAudit.logEvent(
        'network',
        'medium',
        `Rate limit exceeded: ${operation}`,
        { identifier }
      );
    }
    
    return allowed;
  };

  /**
   * تنظيف المدخلات
   */
  const sanitizeInput = {
    html: (input: string) => inputSanitizer.sanitizeHTML(input),
    text: (input: string) => inputSanitizer.sanitizeText(input),
    email: (input: string) => {
      if (!inputSanitizer.validateEmail(input)) {
        throw new Error('Invalid email format');
      }
      return input;
    },
    phone: (input: string) => {
      if (!inputSanitizer.validateIraqiPhone(input)) {
        throw new Error('Invalid Iraqi phone number');
      }
      return input;
    },
    caseNumber: (input: string) => {
      if (!inputSanitizer.validateCaseNumber(input)) {
        throw new Error('Invalid case number (expected format: YYYY/###)');
      }
      return input;
    },
  };

  /**
   * تسجيل حدث أمني
   */
  const logSecurityEvent = (
    type: 'auth' | 'data' | 'network' | 'crypto' | 'violation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details?: Record<string, unknown>
  ) => {
    securityAudit.logEvent(type, severity, message, details);
  };

  return {
    checkRateLimit,
    sanitizeInput,
    logSecurityEvent,
  };
}

/**
 * withSecurity HOC
 * Higher Order Component للحماية التلقائية
 */
export function withSecurity<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return function SecuredComponent(props: P) {
    const { logSecurityEvent } = useSecurityMiddleware();

    useEffect(() => {
      // تسجيل دخول المستخدم للمكون
      logSecurityEvent(
        'data',
        'low',
        `Component mounted: ${Component.name || 'Anonymous'}`,
        {}
      );

      return () => {
        logSecurityEvent(
          'data',
          'low',
          `Component unmounted: ${Component.name || 'Anonymous'}`,
          {}
        );
      };
    }, [logSecurityEvent]);

    return <Component {...props} />;
  };
}
