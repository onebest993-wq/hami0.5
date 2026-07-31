/**
 * Rate Limit Service Tests
 * اختبارات خدمة تحديد معدل الطلبات
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimitService } from '../RateLimitService';

describe('RateLimitService', () => {
  beforeEach(() => {
    (rateLimitService as any).limits.clear();
    rateLimitService.configure('test', {
      maxRequests: 5,
      windowMs: 1000,
      blockDurationMs: 2000,
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', () => {
      for (let i = 0; i < 5; i++) {
        const allowed = rateLimitService.check('test', 'user1');
        expect(allowed).toBe(true);
      }
    });

    it('should block requests over the limit', () => {
      // استخدام الحد الأقصى
      for (let i = 0; i < 5; i++) {
        rateLimitService.check('test', 'user1');
      }

      // الطلب التالي يجب أن يُرفض
      const allowed = rateLimitService.check('test', 'user1');
      expect(allowed).toBe(false);
    });

    it('should reset after window expires', async () => {
      // استخدام الحد الأقصى
      for (let i = 0; i < 5; i++) {
        rateLimitService.check('test', 'user1');
      }

      // انتظار انتهاء النافذة
      await new Promise(resolve => setTimeout(resolve, 1100));

      // يجب السماح بالطلب
      const allowed = rateLimitService.check('test', 'user1');
      expect(allowed).toBe(true);
    });

    it('should track different users separately', () => {
      // user1 يستخدم الحد
      for (let i = 0; i < 5; i++) {
        rateLimitService.check('test', 'user1');
      }

      // user2 يجب أن يكون لديه حد منفصل
      const allowed = rateLimitService.check('test', 'user2');
      expect(allowed).toBe(true);
    });
  });

  describe('Status Information', () => {
    it('should return correct remaining count', () => {
      rateLimitService.check('test', 'user1');
      rateLimitService.check('test', 'user1');

      const status = rateLimitService.getStatus('test', 'user1');
      expect(status?.remaining).toBe(3);
    });

    it('should return allowed status', () => {
      const status = rateLimitService.getStatus('test', 'user1');
      expect(status?.allowed).toBe(true);
    });

    it('should return blocked status after limit', () => {
      for (let i = 0; i < 6; i++) {
        rateLimitService.check('test', 'user1');
      }

      const status = rateLimitService.getStatus('test', 'user1');
      expect(status?.allowed).toBe(false);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset user limit', () => {
      // استخدام الحد الأقصى
      for (let i = 0; i < 6; i++) {
        rateLimitService.check('test', 'user1');
      }

      // إعادة تعيين
      rateLimitService.reset('test', 'user1');

      // يجب السماح بالطلب
      const allowed = rateLimitService.check('test', 'user1');
      expect(allowed).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries', async () => {
      // إنشاء إدخالات
      rateLimitService.check('test', 'user1');
      rateLimitService.check('test', 'user2');

      // انتظار انتهاء الصلاحية
      await new Promise(resolve => setTimeout(resolve, 1100));

      // تنظيف
      rateLimitService.cleanup();

      // الإدخالات يجب أن تكون محذوفة
      const status = rateLimitService.getStatus('test', 'user1');
      expect(status?.remaining).toBe(5);
    });
  });

  describe('Configuration', () => {
    it('should allow operation without configuration', () => {
      const allowed = rateLimitService.check('unconfigured', 'user1');
      expect(allowed).toBe(true);
    });

    it('should use custom configuration', () => {
      rateLimitService.configure('custom', {
        maxRequests: 2,
        windowMs: 1000,
      });

      rateLimitService.check('custom', 'user1');
      rateLimitService.check('custom', 'user1');

      const allowed = rateLimitService.check('custom', 'user1');
      expect(allowed).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid requests', () => {
      let blockedCount = 0;

      for (let i = 0; i < 100; i++) {
        const allowed = rateLimitService.check('test', 'user1');
        if (!allowed) blockedCount++;
      }

      expect(blockedCount).toBeGreaterThan(0);
    });

    it('should handle empty identifier', () => {
      expect(() => {
        rateLimitService.check('test', '');
      }).not.toThrow();
    });

    it('should handle concurrent users', () => {
      const users = ['user1', 'user2', 'user3', 'user4', 'user5'];
      
      users.forEach(user => {
        for (let i = 0; i < 3; i++) {
          const allowed = rateLimitService.check('test', user);
          expect(allowed).toBe(true);
        }
      });
    });
  });
});
