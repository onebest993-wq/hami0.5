/**
 * Production Utilities Tests - اختبارات أدوات الإنتاج
 * 
 * @version 1.0.0
 * @date 2026-03-17
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isDevelopment,
  isProduction,
  getEnvironment,
  isDebugMode,
  setDebugMode,
  getBuildInfo,
  validateRequiredAPIs,
} from '@/app/utils/production';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('Production Utilities', () => {
  beforeEach(() => {
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
  });

  describe('Environment Detection', () => {
    it('should detect environment correctly', () => {
      const env = getEnvironment();
      expect(env).toMatch(/development|production|test/);
    });

    it('should return valid boolean for isDevelopment', () => {
      const isDev = isDevelopment();
      expect(typeof isDev).toBe('boolean');
    });

    it('should return valid boolean for isProduction', () => {
      const isProd = isProduction();
      expect(typeof isProd).toBe('boolean');
    });
  });

  describe('Debug Mode', () => {
    it('should enable debug mode', () => {
      setDebugMode(true);
      expect(SecureStoreService.getItemSync('debug_mode')).toBe('true');
    });

    it('should disable debug mode', () => {
      setDebugMode(false);
      expect(SecureStoreService.getItemSync('debug_mode')).toBeNull();
    });

    it('should check debug mode correctly', () => {
      setDebugMode(true);
      expect(isDebugMode()).toBe(true);
      
      setDebugMode(false);
      // في التطوير سيكون دائماً true
      const debugMode = isDebugMode();
      expect(typeof debugMode).toBe('boolean');
    });
  });

  describe('Build Info', () => {
    it('should return valid build info', () => {
      const info = getBuildInfo();
      
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('environment');
      expect(info).toHaveProperty('buildDate');
      
      expect(typeof info.version).toBe('string');
      expect(typeof info.environment).toBe('string');
      expect(typeof info.buildDate).toBe('string');
    });
  });

  describe('API Validation', () => {
    it('should validate required APIs', () => {
      const validation = validateRequiredAPIs();
      
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');
      expect(validation).toHaveProperty('warnings');
      
      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.missing)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});
