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
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/app/types/admin-types';
import { logAction } from '@/app/utils/auditLog';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

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
  signup: (email: string, password: string, options?: { fullName?: string; role?: 'lawyer' | 'client' | 'admin'; phone?: string }) => Promise<void>;
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
  const bootAuth = readPersistedSupabaseAuth();
  const [user, setUser] = useState<User | null>(bootAuth.user);
  const [session, setSession] = useState<Session | null>(bootAuth.session);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const AUTH_BOOT_TIMEOUT_MS = 8_000;
    const timeoutId = window.setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, AUTH_BOOT_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session ?? null);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSession(null);
        setUser(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (mounted) setIsLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await logAction('login_success', {
      source: 'AuthContext',
      email,
    });
  };

  const signup = async (
    email: string,
    password: string,
    options?: { fullName?: string; role?: 'lawyer' | 'client' | 'admin'; phone?: string },
  ) => {
    const role = options?.role ?? 'lawyer';
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullName: options?.fullName ?? '',
          role,
          phone: options?.phone ?? '',
          systemRole: systemRoleForSignup(role),
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const hasRole = (role: 'lawyer' | 'client' | 'admin'): boolean => {
    const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const systemRole = getSystemRoleFromMetadata(meta);
    if (role === 'admin') return systemRole === UserRole.SUPER_ADMIN;
    if (role === 'client') return systemRole === UserRole.CLIENT;
    return systemRole === UserRole.LAWYER;
  };

  const applyMockSession = async (params: {
    id: string;
    email: string;
    role: 'lawyer' | 'client' | 'admin';
    fullName: string;
    refreshToken: string;
  }): Promise<void> => {
    const nowIso = new Date().toISOString();
    const mockUser = {
      id: params.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: params.email,
      phone: '',
      created_at: nowIso,
      updated_at: nowIso,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        role: params.role,
        fullName: params.fullName,
        systemRole: systemRoleForSignup(params.role),
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
    
  };

  const devBypassLogin = async (): Promise<void> => {
    if (!import.meta.env.DEV) return;
    await applyMockSession({
      id: 'dev-user-uuid-1',
      email: 'dev@local',
      role: 'lawyer',
      fullName: 'Dev User',
      refreshToken: 'DEV_REFRESH_TOKEN',
    });
  };

  const adminBypassLogin = async (): Promise<void> => {
    if (!import.meta.env.DEV) return;
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
