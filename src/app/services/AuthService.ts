/**
 * AuthService - نظام المصادقة الحقيقي باستخدام Supabase Auth
 * 
 * المسؤوليات:
 * - تسجيل الدخول/الخروج
 * - التسجيل
 * - إدارة الجلسات
 * - التحقق من الصلاحيات
 * 
 * @version 1.1.0 — with local token blacklist support
 * @date 2026-04-24
 */

import { supabase } from '@/app/lib/supabase-client';
import { debug } from '@/app/utils/debug';
import SecureStoreService from './SecureStoreService';
import { logAction } from '@/app/utils/auditLog';
import { registerTokenSession, detectStolenToken } from '@/app/security/stolenTokenClient';

// =====================================================
// Types
// =====================================================

export interface User {
  id: string;
  email: string;
  role: 'lawyer' | 'client' | 'admin';
  fullName?: string;
  phone?: string;
  createdAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  fullName: string;
  role: 'lawyer' | 'client';
  phone?: string;
}

function resolveUserRole(user: {
  user_metadata?: unknown;
  app_metadata?: unknown;
}): User['role'] {
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (appMeta.systemRole === 'SUPER_ADMIN' || appMeta.role === 'SUPER_ADMIN') {
    return 'admin';
  }

  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType = userMeta.accountType ?? userMeta.role;
  if (accountType === 'client') return 'client';
  if (accountType === 'lawyer') return 'lawyer';
  return 'lawyer';
}

function coerceRole(value: unknown): User['role'] {
  if (value === 'lawyer' || value === 'client') return value;
  return 'lawyer';
}

function safeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t ? t : undefined;
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.email === 'string' && (v.role === 'lawyer' || v.role === 'client' || v.role === 'admin');
}

const _warn = (...a: unknown[]) => { if (import.meta.env.DEV) console.warn('[AuthService]', ...a); };
const _log = (...a: unknown[]) => { if (import.meta.env.DEV) console.log('[AuthService]', ...a); };
const _err = (...a: unknown[]) => { if (import.meta.env.DEV) console.error('[AuthService]', ...a); };

/** Blacklist TTL: التوكن يُضاف إلى القائمة السوداء لمدة أقصاها (بالمللي ثانية) */
const BLACKLIST_TTL = 5 * 60 * 1000; // 5 دقائق
const BLACKLIST_DB_NAME = 'HamiTokenBlacklist';
const BLACKLIST_STORE = 'blacklistedTokens';

function openBlacklistDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(BLACKLIST_DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BLACKLIST_STORE)) {
          db.createObjectStore(BLACKLIST_STORE, { keyPath: 'tokenHash' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * إضافة توكن إلى القائمة السوداء المحلية
 */
async function blacklistToken(token: string): Promise<void> {
  const db = await openBlacklistDB();
  if (!db) return;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashHex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const tx = db.transaction(BLACKLIST_STORE, 'readwrite');
    const store = tx.objectStore(BLACKLIST_STORE);
    store.put({ tokenHash: hashHex, expiresAt: Date.now() + BLACKLIST_TTL });
    tx.commit();
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
}

/**
 * التحقق مما إذا كان التوكن في القائمة السوداء
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  const db = await openBlacklistDB();
  if (!db) return false;
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hashHex = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const tx = db.transaction(BLACKLIST_STORE, 'readonly');
    const store = tx.objectStore(BLACKLIST_STORE);
    const entry = await new Promise<{ tokenHash: string; expiresAt: number } | undefined>((resolve, reject) => {
      const req = store.get(hashHex);
      req.onsuccess = () => resolve(req.result as { tokenHash: string; expiresAt: number } | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      // التوكن منتهي الصلاحية — نمسحه من الـ blacklist
      const tx2 = db.transaction(BLACKLIST_STORE, 'readwrite');
      tx2.objectStore(BLACKLIST_STORE).delete(hashHex);
      tx2.commit();
      return false;
    }
    return true;
  } catch {
    return false;
  } finally {
    db.close();
  }
}

/** تنظيف التوكنات منتهية الصلاحية من الـ blacklist */
async function cleanBlacklist(): Promise<void> {
  const db = await openBlacklistDB();
  if (!db) return;
  try {
    const tx = db.transaction(BLACKLIST_STORE, 'readwrite');
    const store = tx.objectStore(BLACKLIST_STORE);
    const all = await new Promise<{ tokenHash: string; expiresAt: number }[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as { tokenHash: string; expiresAt: number }[]);
      req.onerror = () => reject(req.error);
    });
    const now = Date.now();
    for (const entry of all) {
      if (now > entry.expiresAt) {
        store.delete(entry.tokenHash);
      }
    }
    tx.commit();
  } catch {
    /* best effort */
  } finally {
    db.close();
  }
}

// تشغيل تنظيف الـ blacklist كل 10 دقائق
if (typeof window !== 'undefined') {
  const w = window as unknown as { __hamiBlacklistCleanup?: ReturnType<typeof setInterval> };
  if (w.__hamiBlacklistCleanup) clearInterval(w.__hamiBlacklistCleanup);
  w.__hamiBlacklistCleanup = setInterval(cleanBlacklist, 10 * 60 * 1000);
}

// =====================================================
// AuthService Class
// =====================================================

export class AuthService {
  
  private static currentUser: User | null = null;
  private static sessionToken: string | null = null;

  /**
   * تسجيل الدخول
   */
  static async login(credentials: LoginCredentials): Promise<User> {
    try {
      debug.log('[AuthService] محاولة تسجيل الدخول:', credentials.email);

      // ✅ استخدام Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        debug.error('[AuthService] خطأ في تسجيل الدخول:', error);
        throw new Error(this.translateAuthError(error.message));
      }

      if (!data.user || !data.session) {
        throw new Error('فشل تسجيل الدخول');
      }

      // ✅ حفظ بيانات المستخدم
      this.sessionToken = data.session.access_token;
      
      // ✅ جلب معلومات المستخدم من metadata
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        role: resolveUserRole(data.user),
        fullName: safeString((data.user.user_metadata as Record<string, unknown> | null | undefined)?.fullName),
        phone: safeString((data.user.user_metadata as Record<string, unknown> | null | undefined)?.phone),
        createdAt: data.user.created_at,
      };

      this.currentUser = user;
      
      // ✅ حفظ في localStorage للجلسة المستمرة
      await SecureStoreService.setItem('auth_user', JSON.stringify(user));
      await SecureStoreService.setItem('auth_token', this.sessionToken);

      // ✅ تسجيل التوكن في نظام الرصد الراداري
      await registerTokenSession(data.session.access_token);

      await logAction('login_success', {
        source: 'AuthService',
        email: user.email,
        userId: user.id,
      });

      debug.log('[AuthService] ✅ تسجيل الدخول بنجاح:', user.email);
      return user;

    } catch (error: unknown) {
      debug.error('[AuthService] فشل تسجيل الدخول:', error);
      throw error;
    }
  }

  /**
   * التسجيل الجديد
   */
  static async signup(credentials: SignupCredentials): Promise<User> {
    try {
      debug.log('[AuthService] محاولة التسجيل:', credentials.email);

      // ✅ استخدام Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            fullName: credentials.fullName,
            accountType: credentials.role,
            phone: credentials.phone,
          },
        },
      });

      if (error) {
        debug.error('[AuthService] خطأ في التسجيل:', error);
        throw new Error(this.translateAuthError(error.message));
      }

      if (!data.user) {
        throw new Error('فشل التسجيل');
      }

      // ✅ إنشاء كائن المستخدم
      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        role: credentials.role,
        fullName: credentials.fullName,
        phone: credentials.phone,
        createdAt: data.user.created_at,
      };

      // ✅ تسجيل الدخول تلقائياً بعد التسجيل
      if (data.session) {
        this.sessionToken = data.session.access_token;
        this.currentUser = user;
        await SecureStoreService.setItem('auth_user', JSON.stringify(user));
        await SecureStoreService.setItem('auth_token', this.sessionToken);
        // ✅ تسجيل التوكن في نظام الرصد الراداري
        await registerTokenSession(data.session.access_token);
      }

      debug.log('[AuthService] ✅ تم التسجيل بنجاح:', user.email);
      return user;

    } catch (error: unknown) {
      debug.error('[AuthService] فشل التسجيل:', error);
      throw error;
    }
  }

  /**
   * تسجيل الخروج
   */
  static async logout(): Promise<void> {
    try {
      _log('محاولة تسجيل الخروج');

      // ✅ إضافة التوكن إلى القائمة السوداء المحلية قبل إنهاء الجلسة
      if (this.sessionToken) {
        await blacklistToken(this.sessionToken);
      }

      // ✅ تسجيل الخروج من Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        _warn('تحذير أثناء تسجيل الخروج:', error);
      }

      // ✅ مسح البيانات المحلية
      this.currentUser = null;
      this.sessionToken = null;
      await SecureStoreService.deleteItem('auth_user');
      await SecureStoreService.deleteItem('auth_token');

      _log('✅ تم تسجيل الخروج بنجاح');

    } catch (error: unknown) {
      _err('[AuthService] فشل تسجيل الخروج:', error);
      throw error;
    }
  }

  /**
   * التحقق من وجود جلسة نشطة
   */
  static async checkSession(): Promise<User | null> {
    try {
      debug.log('[AuthService] التحقق من الجلسة النشطة');

      // ✅ التحقق من localStorage أولاً
      const cachedUser = await SecureStoreService.getItem('auth_user');
      const cachedToken = await SecureStoreService.getItem('auth_token');

      if (cachedUser && cachedToken) {
        try {
          const parsed = JSON.parse(cachedUser) as unknown;
          if (isUser(parsed)) {
            const user = parsed;
            this.currentUser = user;
            this.sessionToken = cachedToken;
            debug.log('[AuthService] ✅ تم استعادة الجلسة من Cache:', user.email);
            return user;
          }
        } catch {
          /* بيانات تالفة — نمسحها ونستكمل لاستعادة الجلسة من Supabase */
        }
        try {
          await SecureStoreService.deleteItem('auth_user');
          await SecureStoreService.deleteItem('auth_token');
        } catch {
          /* ignore */
        }
      }

      // ✅ التحقق من Supabase (with 8s timeout - prevent infinite wait)
      type GetSessionResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;
      const timeoutMs = 8000;
      const { data, error } = await Promise.race<GetSessionResult>([
        supabase.auth.getSession(),
        new Promise<GetSessionResult>((resolve) =>
          window.setTimeout(() => resolve({ data: { session: null }, error: null }), timeoutMs),
        ),
      ]);

      if (error || !data?.session) {
        debug.log('[AuthService] لا توجد جلسة نشطة');
        return null;
      }

      // ✅ التحقق من أن التوكن ليس في القائمة السوداء
      if (await isTokenBlacklisted(data.session.access_token)) {
        _warn('⚠️ Token found in blacklist — session invalid');
        await supabase.auth.signOut();
        return null;
      }

      // ✅ التحقق من أن التوكن ليس مسروقاً (نظام الرصد الراداري)
      const stolenCheck = await detectStolenToken(data.session.access_token);
      if (stolenCheck.status === 'stolen' || stolenCheck.status === 'cloned') {
        _warn(`⚠️ ${stolenCheck.status === 'stolen' ? 'Stolen' : 'Cloned'} token detected — invalidating session`);
        await blacklistToken(data.session.access_token);
        await supabase.auth.signOut();
        return null;
      }

      // ✅ تسجيل التوكن في نظام الرصد الراداري (تحديث الـ sessionId)
      await registerTokenSession(data.session.access_token);

      // ✅ استعادة بيانات المستخدم
      const user: User = {
        id: data.session.user.id,
        email: data.session.user.email || '',
        role: resolveUserRole(data.session.user),
        fullName: safeString((data.session.user.user_metadata as Record<string, unknown> | null | undefined)?.fullName),
        phone: safeString((data.session.user.user_metadata as Record<string, unknown> | null | undefined)?.phone),
        createdAt: data.session.user.created_at,
      };

      this.currentUser = user;
      this.sessionToken = data.session.access_token;

      // ✅ حفظ في localStorage
      await SecureStoreService.setItem('auth_user', JSON.stringify(user));
      await SecureStoreService.setItem('auth_token', this.sessionToken);

      debug.log('[AuthService] ✅ تم استعادة الجلسة من Supabase:', user.email);
      return user;

    } catch (error: unknown) {
      debug.error('[AuthService] خطأ في التحقق من الجلسة:', error);
      return null;
    }
  }

  /**
   * الحصول على المستخدم الحالي
   */
  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * الحصول على رمز الجلسة
   */
  static getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * التحقق من صلاحية المستخدم
   */
  static hasRole(role: 'lawyer' | 'client' | 'admin'): boolean {
    return this.currentUser?.role === role;
  }

  /**
   * التحقق من تسجيل الدخول
   */
  static isAuthenticated(): boolean {
    return this.currentUser !== null && this.sessionToken !== null;
  }

  /**
   * ترجمة رسائل الخطأ من Supabase
   */
  private static translateAuthError(errorMessage: string): string {
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني',
      'User already registered': 'البريد الإلكتروني مسجل مسبقاً',
      'Password should be at least 6 characters': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'Email rate limit exceeded': 'تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً',
    };

    return errorMap[errorMessage] || 'حدث خطأ غير متوقع';
  }

  /**
   * تحديث معلومات المستخدم
   */
  static async updateProfile(updates: Partial<User>): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('لا يوجد مستخدم مسجل دخوله');
      }

      debug.log('[AuthService] تحديث الملف الشخصي');

      const { error } = await supabase.auth.updateUser({
        data: {
          fullName: updates.fullName || this.currentUser.fullName,
          phone: updates.phone || this.currentUser.phone,
        },
      });

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }

      // ✅ تحديث البيانات المحلية
      this.currentUser = {
        ...this.currentUser,
        ...updates,
      };

      await SecureStoreService.setItem('auth_user', JSON.stringify(this.currentUser));

      debug.log('[AuthService] ✅ تم تحديث الملف الشخصي بنجاح');

    } catch (error: unknown) {
      debug.error('[AuthService] فشل تحديث الملف الشخصي:', error);
      throw error;
    }
  }

  /**
   * تغيير كلمة المرور
   */
  static async changePassword(newPassword: string): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('لا يوجد مستخدم مسجل دخوله');
      }

      debug.log('[AuthService] تغيير كلمة المرور');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }

      debug.log('[AuthService] ✅ تم تغيير كلمة المرور بنجاح');

    } catch (error: unknown) {
      debug.error('[AuthService] فشل تغيير كلمة المرور:', error);
      throw error;
    }
  }

  /**
   * إعادة تعيين كلمة المرور
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      debug.log('[AuthService] طلب إعادة تعيين كلمة المرور:', email);

      const redirectTo = `${window.location.origin}/reset-password`;
      const auth = supabase.auth as unknown as Record<string, unknown>;
      const resetFn = auth['resetPasswordForEmail'];
      if (typeof resetFn !== 'function') {
        throw new Error('ميزة إعادة تعيين كلمة المرور غير مدعومة في عميل المصادقة الحالي');
      }
      const res = await (resetFn as (e: string, opts?: { redirectTo?: string }) => Promise<{ error: { message: string } | null }>)(email, {
        redirectTo,
      });
      const error = res?.error ?? null;

      if (error) {
        throw new Error(this.translateAuthError(error.message));
      }

      debug.log('[AuthService] ✅ تم إرسال رابط إعادة التعيين');

    } catch (error: unknown) {
      debug.error('[AuthService] فشل إعادة تعيين كلمة المرور:', error);
      throw error;
    }
  }
}
