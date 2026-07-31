/**
 * AuthContext - سياق المصادقة العام للتطبيق
 *
 * المسؤوليات:
 * - توفير حالة المصادقة لجميع المكونات
 * - إدارة تسجيل الدخول/الخروج
 * - حماية الصفحات (Protected Routes)
 *
 * المنطق الثقيل (BFF/Supabase listeners) في authProviderRuntime — يُحمَّل بعد أول paint.
 *
 * @version 1.0.0
 * @date 2026-03-17
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';
import {
    readPersistedSupabaseAuth,
    writeDevMockAuth,
    clearDevMockAuth,
    clearStaleDevMockFromSupabaseStorage,
    readDevMockAccessToken,
    readDevMockUser,
} from '@/app/utils/authStorage';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import {
    getDevMockLawyerSession,
    resolveDevMockLawyerSession,
    resolveDevMockLawyerUser,
} from '@/app/services/auth/devMockLawyerAuth';
import { resolveInitialAuthState, shouldApplyGuestFallbackSession } from '@/app/context/authBoot';

function resolveBootAuth() {
    return resolveInitialAuthState();
}

// =====================================================
// Types
// =====================================================

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (
        email: string,
        password: string,
        options?: { fullName?: string; accountType?: 'lawyer' | 'client'; phone?: string },
    ) => Promise<void>;
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

    useLayoutEffect(() => {
        setLiveAuthUserId(user?.id ?? null);
    }, [user]);

    useEffect(() => {
        if (!boot.session) return;
        const persisted = readPersistedSupabaseAuth();
        if (!persisted.session) {
            writeDevMockAuth(boot.session);
        }
    }, [boot.session]);

    const applyGuestSession = useCallback((): void => {
        const guest = getDevMockLawyerSession();
        setSession(guest.session);
        setUser(guest.user);
        writeDevMockAuth(guest.session);
    }, []);

    const applySignedOutState = useCallback((): void => {
        setSession(null);
        setUser(null);
        clearDevMockAuth();
    }, []);

    const applyGuestOrSignedOut = useCallback((): void => {
        if (shouldApplyGuestFallbackSession()) {
            applyGuestSession();
            return;
        }
        applySignedOutState();
    }, [applyGuestSession, applySignedOutState]);

    const restoreDevMockIfPresent = useCallback((): boolean => {
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
    }, []);

    const runtimeBindings = useMemo(
        () => ({
            setUser,
            setSession,
            setIsLoading,
            applyGuestSession,
            applySignedOutState,
            applyGuestOrSignedOut,
            restoreDevMockIfPresent,
        }),
        [
            applyGuestSession,
            applySignedOutState,
            applyGuestOrSignedOut,
            restoreDevMockIfPresent,
        ],
    );

    useEffect(() => {
        clearStaleDevMockFromSupabaseStorage();
    }, []);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        void import('@/app/context/authProviderRuntime').then((runtime) => {
            cleanup = runtime.startAuthSessionSync(runtimeBindings);
        });
        return () => cleanup?.();
    }, [runtimeBindings]);

    const login = useCallback(
        async (email: string, password: string) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            await runtime.authLogin(email, password, runtimeBindings);
        },
        [runtimeBindings],
    );

    const signup = useCallback(
        async (
            email: string,
            password: string,
            options?: { fullName?: string; accountType?: 'lawyer' | 'client'; phone?: string },
        ) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            await runtime.authSignup(email, password, options);
        },
        [],
    );

    const logout = useCallback(async () => {
        const runtime = await import('@/app/context/authProviderRuntime');
        await runtime.authLogout(runtimeBindings);
    }, [runtimeBindings]);

    const devBypassLogin = useCallback(async () => {
        const runtime = await import('@/app/context/authProviderRuntime');
        await runtime.authDevBypassLogin(runtimeBindings);
    }, [runtimeBindings]);

    const adminBypassLogin = useCallback(async () => {
        const runtime = await import('@/app/context/authProviderRuntime');
        await runtime.authAdminBypassLogin(runtimeBindings);
    }, [runtimeBindings]);

    const value: AuthContextType = useMemo(() => {
        const effectiveUser = resolveDevMockLawyerUser(user);
        const effectiveSession = resolveDevMockLawyerSession(session, user);
        return {
            user: effectiveUser,
            session: effectiveSession,
            isLoading,
            login,
            signup,
            logout,
            hasRole: (role: 'lawyer' | 'client' | 'admin') => userHasRole(effectiveUser, role),
            devBypassLogin,
            adminBypassLogin,
        };
    }, [user, session, isLoading, login, signup, logout, devBypassLogin, adminBypassLogin]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/** جذر التطبيق — لا يرمي خارج AuthProvider (مقاوم لانقطاع HMR) */
export function useAppRootAuth(): Pick<AuthContextType, 'user' | 'isLoading' | 'logout'> {
    const context = useContext(AuthContext);
    return useMemo(() => {
        if (context !== undefined) {
            return { user: context.user, isLoading: context.isLoading, logout: context.logout };
        }
        const persisted = readPersistedSupabaseAuth();
        const user = resolveDevMockLawyerUser(persisted.user);
        return {
            user,
            isLoading: false,
            logout: async () => {
                const runtime = await import('@/app/context/authProviderRuntime');
                await runtime.performRootAuthLogout();
            },
        };
    }, [context]);
}

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
    return resolveDevMockLawyerUser(readPersistedSupabaseAuth().user);
}

export function userHasRole(user: User | null, role: 'lawyer' | 'client' | 'admin'): boolean {
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
    const user = resolveDevMockLawyerUser(context !== undefined ? context.user : persistedUser);
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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#000000] flex items-center justify-center">
                <div className="text-[#E6C673] text-lg">جاري التحقق...</div>
            </div>
        );
    }

    if (!user) {
        return (
            fallback || (
                <div className="min-h-screen bg-[#000000] flex items-center justify-center">
                    <div className="text-white text-center">
                        <h2 className="text-2xl font-bold mb-4">يرجى تسجيل الدخول</h2>
                        <p className="text-gray-400">تحتاج إلى تسجيل الدخول للوصول إلى هذه الصفحة</p>
                    </div>
                </div>
            )
        );
    }

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
