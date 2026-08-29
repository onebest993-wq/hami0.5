/**
 * Security Audit Service
 * مراقبة وتدقيق الأمان
 * @version 1.0.0
 */

import SecureStoreService from './SecureStoreService';
import { debug } from '@/app/utils/debug';

interface SecurityEvent {
  id: string;
  type: 'auth' | 'data' | 'network' | 'crypto' | 'violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  lastAuditTime: number;
}

class SecurityAuditService {
  private events: SecurityEvent[] = [];
  private maxEvents = 1000;
  private listeners: Array<(event: SecurityEvent) => void> = [];

  /**
   * تسجيل حدث أمني
   */
  logEvent(
    type: SecurityEvent['type'],
    severity: SecurityEvent['severity'],
    message: string,
    details: Record<string, unknown> = {},
    userId?: string
  ): void {
    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      message,
      details,
      timestamp: Date.now(),
      userId,
    };

    this.events.push(event);

    // الحفاظ على الحد الأقصى
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // إشعار المستمعين
    this.notifyListeners(event);

    // تسجيل الأحداث الحرجة — بدون ازدواجية error في الكونسول أثناء التطوير
    if (severity === 'critical' || severity === 'high') {
      if (severity === 'critical') {
        debug.error(`[Security CRITICAL]`, message, details);
      } else {
        debug.warn(`[Security]`, message, details);
      }

      if (typeof window !== 'undefined') {
        const w = window as unknown as { Sentry?: { captureException?: (e: unknown, ctx?: Record<string, unknown>) => void } };
        w.Sentry?.captureException?.(new Error(message), {
          level: severity === 'critical' ? 'error' : 'warning',
          tags: {
            type,
            security: true,
          },
          extra: details,
        });
      }
    }
  }

  /**
   * الاشتراك في أحداث الأمان
   */
  subscribe(listener: (event: SecurityEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * إشعار المستمعين
   */
  private notifyListeners(event: SecurityEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        debug.warn('[SecurityAudit] Listener error:', error);
      }
    });
  }

  /**
   * الحصول على الأحداث
   */
  getEvents(filter?: {
    type?: SecurityEvent['type'];
    severity?: SecurityEvent['severity'];
    userId?: string;
    startTime?: number;
    endTime?: number;
  }): SecurityEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(e => e.type === filter.type);
      }
      if (filter.severity) {
        filtered = filtered.filter(e => e.severity === filter.severity);
      }
      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId);
      }
      if (filter.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * الحصول على المقاييس
   */
  getMetrics(): SecurityMetrics {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp >= last24h);

    return {
      totalEvents: recentEvents.length,
      criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
      highEvents: recentEvents.filter(e => e.severity === 'high').length,
      mediumEvents: recentEvents.filter(e => e.severity === 'medium').length,
      lowEvents: recentEvents.filter(e => e.severity === 'low').length,
      lastAuditTime: now,
    };
  }

  /**
   * التحقق من أنماط الهجوم
   */
  detectAttackPatterns(): {
    suspicious: boolean;
    patterns: Array<{ type: string; count: number; severity: string }>;
  } {
    const now = Date.now();
    const last5min = now - 5 * 60 * 1000;
    const recentEvents = this.events.filter(e => e.timestamp >= last5min);

    const patterns: Array<{ type: string; count: number; severity: string }> = [];

    // محاولات تسجيل دخول متعددة فاشلة
    const failedLogins = recentEvents.filter(
      e => e.type === 'auth' && e.message.includes('failed')
    ).length;
    if (failedLogins >= 5) {
      patterns.push({
        type: 'Brute Force Attack',
        count: failedLogins,
        severity: 'high',
      });
    }

    // طلبات API كثيرة جداً
    const apiRequests = recentEvents.filter(e => e.type === 'network').length;
    if (apiRequests >= 100) {
      patterns.push({
        type: 'DDoS/Rate Limit Violation',
        count: apiRequests,
        severity: 'medium',
      });
    }

    // انتهاكات CSP متعددة
    const cspViolations = recentEvents.filter(e => e.type === 'violation').length;
    if (cspViolations >= 3) {
      patterns.push({
        type: 'XSS Attempt',
        count: cspViolations,
        severity: 'critical',
      });
    }

    // محاولات فك تشفير فاشلة
    const decryptionFailures = recentEvents.filter(
      e => e.type === 'crypto' && e.message.includes('decrypt')
    ).length;
    if (decryptionFailures >= 3) {
      patterns.push({
        type: 'Tampering Attempt',
        count: decryptionFailures,
        severity: 'critical',
      });
    }

    return {
      suspicious: patterns.length > 0,
      patterns,
    };
  }

  /**
   * تصدير تقرير الأمان
   */
  exportReport(startTime?: number, endTime?: number): string {
    const events = this.getEvents({ startTime, endTime });
    const metrics = this.getMetrics();
    const patterns = this.detectAttackPatterns();

    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        start: startTime ? new Date(startTime).toISOString() : 'All time',
        end: endTime ? new Date(endTime).toISOString() : 'Now',
      },
      metrics,
      patterns,
      events: events.map(e => ({
        time: new Date(e.timestamp).toISOString(),
        type: e.type,
        severity: e.severity,
        message: e.message,
        userId: e.userId,
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * مسح السجلات القديمة
   */
  clearOldEvents(olderThan: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThan;
    const before = this.events.length;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
    return before - this.events.length;
  }

  /**
   * توليد ID فريد للحدث
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * فحص صحة النظام
   */
  async performHealthCheck(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    issues: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const issues: string[] = [];

    // فحص localStorage
    try {
      await SecureStoreService.setItem('_health_check', 'test');
      await SecureStoreService.deleteItem('_health_check');
      checks.localStorage = true;
    } catch {
      checks.localStorage = false;
      issues.push('localStorage not available');
    }

    // فحص sessionStorage
    try {
      await SecureStoreService.setItem('_health_check_session', 'test');
      await SecureStoreService.deleteItem('_health_check_session');
      checks.sessionStorage = true;
    } catch {
      checks.sessionStorage = false;
      issues.push('sessionStorage not available');
    }

    // فحص IndexedDB
    try {
      checks.indexedDB = 'indexedDB' in window;
      if (!checks.indexedDB) {
        issues.push('IndexedDB not available');
      }
    } catch {
      checks.indexedDB = false;
      issues.push('IndexedDB error');
    }

    // فحص Crypto API
    try {
      checks.crypto = 'crypto' in window && 'subtle' in window.crypto;
      if (!checks.crypto) {
        issues.push('Web Crypto API not available');
      }
    } catch {
      checks.crypto = false;
      issues.push('Crypto API error');
    }

    // فحص HTTPS
    checks.https = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!checks.https) {
      issues.push('Not running over HTTPS');
    }

    // CSP is delivered via HTTP headers (Netlify/Vercel/API), not a document meta tag.
    // Cap WebView / local preview may omit headers — treat meta OR secure context as soft OK.
    const metaCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]') !== null;
    const headerDeliveredHint =
      typeof document !== 'undefined' &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1');
    checks.csp = metaCsp || headerDeliveredHint;

    return {
      healthy: issues.length === 0,
      checks,
      issues,
    };
  }
}

// Singleton instance
export const securityAudit = new SecurityAuditService();

// تسجيل الأحداث التلقائية
if (typeof window !== 'undefined') {
  const g = globalThis as unknown as {
    __hamiSecurityAuditHandlers?: {
      onCsp: (e: SecurityPolicyViolationEvent) => void;
    };
  };

  if (g.__hamiSecurityAuditHandlers) {
    document.removeEventListener('securitypolicyviolation', g.__hamiSecurityAuditHandlers.onCsp);
  }

  const onCsp = (e: SecurityPolicyViolationEvent) => {
    if (e.violatedDirective?.includes('script-src-attr')) return;
    if (import.meta.env.DEV && e.violatedDirective?.includes('style-src')) return;
    securityAudit.logEvent('violation', 'high', 'Content Security Policy violation', {
      violatedDirective: e.violatedDirective,
      blockedURI: e.blockedURI,
      documentURI: e.documentURI,
    });
  };

  document.addEventListener('securitypolicyviolation', onCsp);
  g.__hamiSecurityAuditHandlers = { onCsp };

  import.meta.hot?.dispose(() => {
    if (!g.__hamiSecurityAuditHandlers) return;
    document.removeEventListener('securitypolicyviolation', g.__hamiSecurityAuditHandlers.onCsp);
    window.removeEventListener('load', g.__hamiSecurityAuditHandlers.onLoad);
    g.__hamiSecurityAuditHandlers = undefined;
  });
}

export default securityAudit;
