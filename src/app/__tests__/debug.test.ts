/**
 * Debug Utility Tests - اختبارات أداة Debug
 * 
 * @version 1.0.0
 * @date 2026-03-17
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debug } from '@/app/utils/debug';
import { SecureFetchError } from '@/app/services/SecureAPIClient';

describe('Debug Utility', () => {
  let consoleSpy: {
    log: any;
    warn: any;
    error: any;
    info: any;
  };

  beforeEach(() => {
    // ✅ إنشاء Spies لمراقبة console
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    // ✅ استعادة console الأصلي
    vi.restoreAllMocks();
  });

  describe('Debug Methods', () => {
    it('should have log method', () => {
      expect(debug.log).toBeDefined();
      expect(typeof debug.log).toBe('function');
    });

    it('should have warn method', () => {
      expect(debug.warn).toBeDefined();
      expect(typeof debug.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(debug.error).toBeDefined();
      expect(typeof debug.error).toBe('function');
    });

    it('should have info method', () => {
      expect(debug.info).toBeDefined();
      expect(typeof debug.info).toBe('function');
    });

    it('should have time and timeEnd methods', () => {
      expect(debug.time).toBeDefined();
      expect(debug.timeEnd).toBeDefined();
      expect(typeof debug.time).toBe('function');
      expect(typeof debug.timeEnd).toBe('function');
    });
  });

  describe('Error Logging', () => {
    it('should always log errors (even in production)', () => {
      const testError = new Error('Test Error');
      debug.error('Error:', testError);
      
      // ✅ console.error يُستدعى دائماً
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should suppress benign secure fetch errors unless verbose console is enabled', () => {
      debug.error('[timelineEventsSupabase] جلب — استثناء:', new SecureFetchError('api_unavailable', 503, '', 'http://localhost/api'));
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe('Development Logging', () => {
    it('should call debug.log without throwing', () => {
      expect(() => {
        debug.log('Test message');
      }).not.toThrow();
    });

    it('should call debug.warn without throwing', () => {
      expect(() => {
        debug.warn('Test warning');
      }).not.toThrow();
    });

    it('should call debug.info without throwing', () => {
      expect(() => {
        debug.info('Test info');
      }).not.toThrow();
    });
  });

  describe('Performance Timing', () => {
    it('should handle time() without throwing', () => {
      expect(() => {
        debug.time('test-timer');
      }).not.toThrow();
    });

    it('should handle timeEnd() without throwing', () => {
      expect(() => {
        debug.time('test-timer');
        debug.timeEnd('test-timer');
      }).not.toThrow();
    });
  });
});
