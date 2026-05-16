/**
 * Security Audit Service Tests
 * اختبارات خدمة التدقيق الأمني
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { securityAudit } from '../SecurityAuditService';

describe('SecurityAuditService', () => {
  beforeEach(() => {
    // مسح الأحداث السابقة
    securityAudit.clearOldEvents(-1);
  });

  describe('Event Logging', () => {
    it('should log security events', () => {
      securityAudit.logEvent('auth', 'high', 'Login attempt', { ip: '127.0.0.1' });

      const events = securityAudit.getEvents();
      expect(events.length).toBe(1);
      expect(events[0].type).toBe('auth');
      expect(events[0].severity).toBe('high');
    });

    it('should include user ID if provided', () => {
      securityAudit.logEvent('data', 'low', 'Data access', {}, 'user123');

      const events = securityAudit.getEvents();
      expect(events[0].userId).toBe('user123');
    });

    it('should generate unique event IDs', () => {
      securityAudit.logEvent('auth', 'low', 'Event 1');
      securityAudit.logEvent('auth', 'low', 'Event 2');

      const events = securityAudit.getEvents();
      expect(events[0].id).not.toBe(events[1].id);
    });
  });

  describe('Event Filtering', () => {
    beforeEach(() => {
      securityAudit.clearOldEvents(-1);
      securityAudit.logEvent('auth', 'critical', 'Failed login');
      securityAudit.logEvent('data', 'low', 'Data read');
      securityAudit.logEvent('network', 'high', 'Suspicious request');
    });

    it('should filter by type', () => {
      const authEvents = securityAudit.getEvents({ type: 'auth' });
      expect(authEvents.length).toBe(1);
      expect(authEvents[0].type).toBe('auth');
    });

    it('should filter by severity', () => {
      const criticalEvents = securityAudit.getEvents({ severity: 'critical' });
      expect(criticalEvents.length).toBe(1);
      expect(criticalEvents[0].severity).toBe('critical');
    });

    it('should filter by user ID', () => {
      securityAudit.logEvent('auth', 'low', 'User action', {}, 'user1');
      
      const userEvents = securityAudit.getEvents({ userId: 'user1' });
      expect(userEvents.length).toBe(1);
      expect(userEvents[0].userId).toBe('user1');
    });

    it('should filter by time range', () => {
      const now = Date.now();
      const startTime = now - 1000;
      const endTime = now + 1000;

      const events = securityAudit.getEvents({ startTime, endTime });
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics', () => {
    beforeEach(() => {
      securityAudit.clearOldEvents(-1);
      securityAudit.logEvent('auth', 'critical', 'Critical event');
      securityAudit.logEvent('data', 'high', 'High event');
      securityAudit.logEvent('network', 'medium', 'Medium event');
      securityAudit.logEvent('crypto', 'low', 'Low event');
    });

    it('should calculate correct metrics', () => {
      const metrics = securityAudit.getMetrics();

      expect(metrics.totalEvents).toBe(4);
      expect(metrics.criticalEvents).toBe(1);
      expect(metrics.highEvents).toBe(1);
      expect(metrics.mediumEvents).toBe(1);
      expect(metrics.lowEvents).toBe(1);
    });

    it('should only count recent events', async () => {
      // مسح الأحداث القديمة
      securityAudit.clearOldEvents(-1);

      // إضافة حدث جديد
      securityAudit.logEvent('auth', 'low', 'New event');

      const metrics = securityAudit.getMetrics();
      expect(metrics.totalEvents).toBe(1);
    });
  });

  describe('Attack Pattern Detection', () => {
    it('should detect brute force attempts', () => {
      for (let i = 0; i < 5; i++) {
        securityAudit.logEvent('auth', 'high', 'Login failed');
      }

      const patterns = securityAudit.detectAttackPatterns();
      expect(patterns.suspicious).toBe(true);
      expect(patterns.patterns.some(p => p.type.includes('Brute Force'))).toBe(true);
    });

    it('should detect DDoS attempts', () => {
      for (let i = 0; i < 100; i++) {
        securityAudit.logEvent('network', 'medium', 'API request');
      }

      const patterns = securityAudit.detectAttackPatterns();
      expect(patterns.suspicious).toBe(true);
      expect(patterns.patterns.some(p => p.type.includes('DDoS'))).toBe(true);
    });

    it('should detect XSS attempts', () => {
      for (let i = 0; i < 3; i++) {
        securityAudit.logEvent('violation', 'high', 'CSP violation');
      }

      const patterns = securityAudit.detectAttackPatterns();
      expect(patterns.suspicious).toBe(true);
      expect(patterns.patterns.some(p => p.type.includes('XSS'))).toBe(true);
    });

    it('should detect tampering attempts', () => {
      for (let i = 0; i < 3; i++) {
        securityAudit.logEvent('crypto', 'critical', 'Failed to decrypt');
      }

      const patterns = securityAudit.detectAttackPatterns();
      expect(patterns.suspicious).toBe(true);
      expect(patterns.patterns.some(p => p.type.includes('Tampering'))).toBe(true);
    });
  });

  describe('Event Subscription', () => {
    it('should notify subscribers of new events', () => {
      const mockListener = vi.fn();
      const unsubscribe = securityAudit.subscribe(mockListener);

      securityAudit.logEvent('auth', 'low', 'Test event');

      expect(mockListener).toHaveBeenCalled();
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'auth',
          severity: 'low',
          message: 'Test event',
        })
      );

      unsubscribe();
    });

    it('should handle multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      securityAudit.subscribe(listener1);
      securityAudit.subscribe(listener2);

      securityAudit.logEvent('auth', 'low', 'Test');

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const mockListener = vi.fn();
      const unsubscribe = securityAudit.subscribe(mockListener);

      unsubscribe();

      securityAudit.logEvent('auth', 'low', 'Test');

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Report Export', () => {
    it('should export security report', () => {
      securityAudit.logEvent('auth', 'high', 'Test event');

      const report = securityAudit.exportReport();
      const parsed = JSON.parse(report);

      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('metrics');
      expect(parsed).toHaveProperty('patterns');
      expect(parsed).toHaveProperty('events');
    });

    it('should include time period in report', () => {
      const now = Date.now();
      const report = securityAudit.exportReport(now - 1000, now + 1000);
      const parsed = JSON.parse(report);

      expect(parsed.period).toHaveProperty('start');
      expect(parsed.period).toHaveProperty('end');
    });
  });

  describe('Cleanup', () => {
    it('should clear old events', async () => {
      securityAudit.logEvent('auth', 'low', 'Old event');

      // انتظار قليل
      await new Promise(resolve => setTimeout(resolve, 100));

      const cleared = securityAudit.clearOldEvents(50);
      expect(cleared).toBe(1);
    });

    it('should keep recent events', () => {
      securityAudit.logEvent('auth', 'low', 'Recent event');

      const cleared = securityAudit.clearOldEvents(1000);
      expect(cleared).toBe(0);
    });
  });

  describe('Health Check', () => {
    it('should perform system health check', async () => {
      const health = await securityAudit.performHealthCheck();

      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('issues');
    });

    it('should check localStorage availability', async () => {
      const health = await securityAudit.performHealthCheck();

      expect(health.checks).toHaveProperty('localStorage');
    });

    it('should check crypto API availability', async () => {
      const health = await securityAudit.performHealthCheck();

      expect(health.checks).toHaveProperty('crypto');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty details', () => {
      expect(() => {
        securityAudit.logEvent('auth', 'low', 'Test');
      }).not.toThrow();
    });

    it('should handle listener errors', () => {
      const badListener = () => {
        throw new Error('Listener error');
      };

      securityAudit.subscribe(badListener);

      expect(() => {
        securityAudit.logEvent('auth', 'low', 'Test');
      }).not.toThrow();
    });

    it('should maintain max events limit', () => {
      // تسجيل أكثر من الحد الأقصى (1000)
      for (let i = 0; i < 1100; i++) {
        securityAudit.logEvent('auth', 'low', `Event ${i}`);
      }

      const events = securityAudit.getEvents();
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });
});
