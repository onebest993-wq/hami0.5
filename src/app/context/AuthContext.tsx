/**
 * AuthContext - سياق المصادقة العام للتطبيق
 * 
 * المسؤوليات:
 * - توفير حالة المصادقة لجميع المكونات
 * - إدارة تسجيل الدخول/الخروج
 * - حماية الصفحات (Protected Routes)
 * 
 * @version 1.0.0
 * @date 2026-03-17
 */

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';
import { logAction } from '@/app/utils/auditLog';
import { readPersistedSupabaseAuth, writeDevMockAuth, clearDevMockAuth, clearStaleDevMockFromSupabaseStorage, readDevMockAccessToken, readDevMockUser, hasPersistedSupabaseSession } from '@/app/utils/authStorage';
import { attachSupabaseAuthListener, signInWithPassword, signOutSupabase, signUpWithPassword } from '@/app/utils/authSupabaseLazy';
import { createGuestLawyerSession, GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { bffLogin, bffLogout, bootstrapBffCsrfSession, fetchBffSession, isBffAuthEnabled, runBffLocalAuthMigration, startBffSessionKeeper } from '@/app/utils/bffAuthClient';
import { clearCsrfSessionToken } from '@/app/security/csrfSession';
import { resolveInitialAuthState, shouldApplyGuestFallbackSession } from '@/app/context/authBoot';


function resolveBootAuth() {
  return resolveInitialAuthState();
}

async function deriveKeyFromSessionSecret(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']);
  return await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('HAMI_SESSION_SALT_V1'), iterations: 150_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// =====================================================
// Types
// =====================================================

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, options?: { fullName?: string; accountType?: 'lawyer' | 'client'; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: 'lawyer' | 'client' | 'admin') => boolean;
  devBypassLogin: () => Promise<void>;
  adminBypassLogin: () => Promise<void>;
}

function getSystemRoleFromMetadata(meta: Record<string, unknown>): UserRole | null {
  const systemRole = meta.systemRole;
  if (typeof systemRole === 'string') {
    if (systemRole === UserRole.SUPER_ADMIN) return UserRole.SUPER_ADMIN;
    if (systemRole === UserRole.LAWYER) return UserRole.LAWYER;
    if (systemRole === UserRole.CLIENT) return UserRole.CLIENT;
  }
  const legacyRole = meta.role;
  if (legacyRole === 'admin') return UserRole.SUPER_ADMIN;
  if (legacyRole === 'lawyer') return UserRole.LAWYER;
  if (legacyRole === 'client') return UserRole.CLIENT;
  return null;
}

export function isSuperAdminUser(user: User | null): boolean {
  if (!user) return false;
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  if (getSystemRoleFromMetadata(appMeta) === UserRole.SUPER_ADMIN) return true;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return getSystemRoleFromMetadata(userMeta) === UserRole.SUPER_ADMIN;
}

function systemRoleForSignup(role: 'lawyer' | 'client' | 'admin'): UserRole {
  if (role === 'admin') return UserRole.SUPER_ADMIN;
  if (role === 'client') return UserRole.CLIENT;
  return UserRole.LAWYER;
}

// =====================================================
// Context Creation
// =====================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// =====================================================
// Provider Component
// =====================================================

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const boot = resolveBootAuth();

  const [user, setUser] = useState<User | null>(boot.user);
  const [session, setSession] = useState<Session | null>(boot.session);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!boot.session) return;
    const persisted = readPersistedSupabaseAuth();
    if (!persisted.session) {
      writeDevMockAuth(boot.session);
    }
  }, [boot.session]);

  const applyGuestSession = (): void => {
    const guest = createGuestLawyerSession();
    setSession(guest.session);
    setUser(guest.user);
    writeDevMockAuth(guest.session);
  };

  const applySignedOutState = (): void => {
    setSession(null);
    setUser(null);
    clearDevMockAuth();
  };

  const applyGuestOrSignedOut = (): void => {
    if (shouldApplyGuestFallbackSession()) {
      applyGuestSession();
      return;
    }
    applySignedOutState();
  };

  const restoreDevMockIfPresent = (): boolean => {
    const devUser = readDevMockUser();
    const devToken = readDevMockAccessToken();
    if (!devUser || !devToken) return false;
    if (import.meta.env.PROD && !shouldApplyGuestFallbackSession()) {
      clearDevMockAuth();
      return false;
    }
    setSession({
      access_token: devToken,
      token_type: 'bearer',
      expires_in: 60 * 60,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      refresh_token: 'DEV_REFRESH_TOKEN',
      user: devUser,
    } as Session);
    setUser(devUser);
    return true;
  };

  useEffect(() => {
    clearStaleDevMockFromSupabaseStorage();
  }, []);

  useEffect(() => {
    let mounted = true;
    let detach: (() => void) | undefined;

    const applySession = (next: Session | null) => {
      if (!mounted) return;
      if (next) {
        setSession(next);
        setUser(next.user ?? null);
        setIsLoading(false);
        return;
      }
      if (!restoreDevMockIfPresent()) {
        applyGuestOrSignedOut();
      }
      setIsLoading(false);
    };

    if (isBffAuthEnabled()) {
      setIsLoading(true);
      let stopKeeper: (() => void) | undefined;
      void runBffLocalAuthMigration()
        .then(() => fetchBffSession())
        .then(async (bffUser) => {
          if (!mounted) return;
          if (bffUser) {
            setUser(bffUser);
            setSession(null);
            stopKeeper = startBffSessionKeeper();
            await bootstrapBffCsrfSession();
          } else if (!restoreDevMockIfPresent()) {
            applyGuestOrSignedOut();
          }
        })
        .catch(() => {
          if (!mounted) return;
          if (!restoreDevMockIfPresent()) {
            applyGuestOrSignedOut();
          }
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
      return () => {
        mounted = false;
        stopKeeper?.();
      };
    }

    if (!hasPersistedSupabaseSession()) {
      return () => {
        mounted = false;
        detach?.();
      };
    }

    const AUTH_BOOT_TIMEOUT_MS = 8_000;
    const timeoutId = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    void attachSupabaseAuthListener({
      onSession: applySession,
      onReady: () => {
        window.clearTimeout(timeoutId);
        if (mounted) setIsLoading(false);
      },
    })
      .then((unsub) => {
        detach = unsub;
      })
      .catch(() => {
        window.clearTimeout(timeoutId);
        if (!mounted) return;
        if (!restoreDevMockIfPresent()) {
          applyGuestOrSignedOut();
        }
        setIsLoading(false);
      });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      detach?.();
    };
  }, []);

  const login = async (email: string, password: string) => {
    if (isBffAuthEnabled()) {
      await runBffLocalAuthMigration();
      await signOutSupabase().catch(() => undefined);
      const bffUser = await bffLogin(email, password);
      setUser(bffUser);
      setSession(null);
      await bootstrapBffCsrfSession();
      await logAction('login_success', {
        source: 'AuthContext',
        email,
        mode: 'bff',
      });
      return;
    }
    const { session, error } = await signInWithPassword(email, password);
    if (error) throw error;
    if (session) {
      setSession(session);
      setUser(session.user ?? null);
    }
    await logAction('login_success', {
      source: 'AuthContext',
      email,
    });
  };

  const signup = async (
    email: string,
    password: string,
    options?: { fullName?: string; accountType?: 'lawyer' | 'client'; phone?: string },
  ) => {
    const accountType = options?.accountType ?? 'lawyer';
    const { error } = await signUpWithPassword(email, password, {
      data: {
        fullName: options?.fullName ?? '',
        phone: options?.phone ?? '',
        accountType,
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    clearDevMockAuth();
    if (isBffAuthEnabled()) {
      try {
        const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
        await SecureAPIClient.fetchSecure('/api/security/csrf', { method: 'DELETE' });
      } catch {
        /* best effort */
      }
      clearCsrfSessionToken();
      await bffLogout();
      applyGuestOrSignedOut();
      return;
    }
    await signOutSupabase();
    applyGuestOrSignedOut();
  };

  const hasRole = (role: 'lawyer' | 'client' | 'admin'): boolean => userHasRole(user, role);

  const applyMockSession = async (params: {
    id: string;
    email: string;
    role: 'lawyer' | 'client' | 'admin';
    fullName: string;
    refreshToken: string;
  }): Promise<void> => {
    const nowIso = new Date().toISOString();
    const systemRole = systemRoleForSignup(params.role);
    const mockUser = {
      id: params.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: params.email,
      phone: '',
      created_at: nowIso,
      updated_at: nowIso,
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        systemRole,
        ...(params.role === 'admin' ? { role: UserRole.SUPER_ADMIN } : {}),
      },
      user_metadata: {
        role: params.role,
        fullName: params.fullName,
        systemRole,
      },
    } as unknown as User;

    const mockSession = {
      access_token: `dev-access-token-${params.id}`,
      token_type: 'bearer',
      expires_in: 60 * 60,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      refresh_token: params.refreshToken,
      user: mockUser,
    } as unknown as Session;

    setSession(mockSession);
    setUser(mockUser);
    setIsLoading(false);
    writeDevMockAuth(mockSession);

    if (params.role === 'lawyer' && !import.meta.env.DEV) {
      void import('@/app/runtime/lawyerDashboardLoader').then((m) => m.prefetchLawyerDashboardEntry());
    }
    
  };

  const devBypassLogin = async (): Promise<void> => {
    await applyMockSession({
      id: 'dev-user-uuid-1',
      email: 'dev@local',
      role: 'lawyer',
      fullName: 'Dev User',
      refreshToken: 'DEV_REFRESH_TOKEN',
    });
  };

  const adminBypassLogin = async (): Promise<void> => {
    await applyMockSession({
      id: 'admin-uuid-1',
      email: 'admin@local',
      role: 'admin',
      fullName: 'Dev Super Admin',
      refreshToken: 'DEV_ADMIN_REFRESH_TOKEN',
    });
  };

  const value: AuthContextType = useMemo(
    () => ({
      user,
      session,
      isLoading,
      login,
      signup,
      logout,
      hasRole,
      devBypassLogin,
      adminBypassLogin,
    }),
    [user, session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// =====================================================
// Hook للاستخدام
// =====================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/** للمكوّنات lazy — لا يرمي إذا انفصل الـ context بسبب تقسيم الحزم/HMR */
export function useAuthUser(): User | null {
  const context = useContext(AuthContext);
  if (context !== undefined) return context.user;
  return readPersistedSupabaseAuth().user;
}

export function userHasRole(
  user: User | null,
  role: 'lawyer' | 'client' | 'admin',
): boolean {
  if (!user) return false;
  if (role === 'admin') return isSuperAdminUser(user);
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType = typeof meta.accountType === 'string' ? meta.accountType : 'lawyer';
  if (role === 'client') return accountType === 'client';
  return accountType !== 'client';
}

/** للمكوّنات lazy — user + hasRole + isLoading دون رمي خارج AuthProvider */
export function useAuthSafe(): {
  user: User | null;
  isLoading: boolean;
  hasRole: (role: 'lawyer' | 'client' | 'admin') => boolean;
} {
  const context = useContext(AuthContext);
  const persistedUser = readPersistedSupabaseAuth().user;
  const user = context !== undefined ? context.user : persistedUser;
  const isLoading = context !== undefined ? context.isLoading : false;
  const hasRole = useMemo(
    () => (role: 'lawyer' | 'client' | 'admin') => userHasRole(user, role),
    [user],
  );
  return { user, isLoading, hasRole };
}

// =====================================================
// مكون حماية الصفحات
// =====================================================

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'lawyer' | 'client' | 'admin';
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback,
}) => {
  const { user, isLoading, hasRole } = useAuth();

  // ✅ عرض Loader أثناء التحقق
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#E6C673] text-lg">جاري التحقق...</div>
      </div>
    );
  }

  // ✅ إعادة توجيه إذا لم يكن مسجل دخول
  if (!user) {
    return fallback || (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
          <p className="text-gray-400">تحتاج إلى تسجيل الدخول للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  // ✅ التحقق من الصلاحية المطلوبة
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
          <p className="text-gray-400">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
