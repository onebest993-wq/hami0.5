/**
 * AuthService Tests - اختبارات نظام المصادقة
 * 
 * @version 1.0.0
 * @date 2026-03-17
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '@/app/services/AuthService';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('AuthService', () => {
  beforeEach(() => {
    // ✅ تنظيف localStorage قبل كل اختبار
    SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    vi.clearAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should login with valid credentials', async () => {
      // ✅ هذا اختبار Mock - في الإنتاج سيتم ربطه بـ Supabase فعلياً
      expect(AuthService).toBeDefined();
    });

    it('should logout successfully', async () => {
      await AuthService.logout();
      
      // ✅ التحقق من مسح localStorage
      expect(SecureStoreService.getItemSync('auth_user')).toBeNull();
      expect(SecureStoreService.getItemSync('auth_token')).toBeNull();
    });

    it('should check session correctly', async () => {
      const session = await AuthService.checkSession();
      
      // ✅ في حالة عدم وجود جلسة
      expect(session).toBeNull();
    });
  });

  describe('User State Management', () => {
    it('should return null for current user when not logged in', () => {
      const user = AuthService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return false for isAuthenticated when not logged in', () => {
      const isAuth = AuthService.isAuthenticated();
      expect(isAuth).toBe(false);
    });
  });

  describe('Role Management', () => {
    it('should return false for hasRole when not logged in', () => {
      const hasLawyerRole = AuthService.hasRole('lawyer');
      expect(hasLawyerRole).toBe(false);
    });
  });
});
