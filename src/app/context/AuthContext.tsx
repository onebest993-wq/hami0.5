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
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from '@/app/context/authHooks';
import type { Session, User } from '@supabase/supabase-js';
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
import {
    resolveInitialAuthState,
    shouldApplyGuestFallbackSession,
    shouldHoldAuthGateUntilSessionProbe,
    shouldRestoreGuestWhenServerHasNoSession,
    shouldKeepStoredNonGuestDevMock,
} from '@/app/context/authBoot';
import { userHasRole } from '@/app/context/authRoleUtils';
import {
    AuthContext,
    type AuthContextType,
    type RegisterLawyerInput,
} from '@/app/context/authContextStore';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import { isExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { isShellAuthBypassed, isShellDemoUserId } from '@/app/services/auth/shellAuth';
import { HAMI_REQUEST_AUTH_GATE_EVENT } from '@/app/services/auth/requestAuthGateFromGuest';
import {
    isPlainDocumentSurface,
    whenPlainDocumentCoverClears,
} from '@/boot/plainDocumentPath';

export type { RegisterLawyerInput, AuthContextType } from '@/app/context/authContextStore';

function resolveBootAuth() {
    return resolveInitialAuthState();
}

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
    const [isLoading, setIsLoading] = useState(() => shouldHoldAuthGateUntilSessionProbe(boot));

    useLayoutEffect(() => {
        // امسح ضيفاً عالقاً عند إغلاق الشِل حتى تظهر بوابة الدخول فوراً
        if (isShellAuthBypassed() || isExplicitLocalGuest() || isExplicitDevUnlock()) return;
        if (user && isShellDemoUserId(user.id)) {
            clearDevMockAuth();
            setUser(null);
            setSession(null);
            setLiveAuthUserId(null);
        }
    }, []);

    useLayoutEffect(() => {
        setLiveAuthUserId(user?.id ?? null);
    }, [user]);

    useEffect(() => {
        if (!boot.session) return;
        // لا تُثبّت جلسة ضيف في التخزين عندما تكون بوابة الدخول مغلقة
        if (!shouldApplyGuestFallbackSession() && !isExplicitLocalGuest() && !isExplicitDevUnlock()) return;
        const persisted = readPersistedSupabaseAuth();
        if (!persisted.session) {
            if (
                shouldKeepStoredNonGuestDevMock() &&
                boot.session.user &&
                isShellDemoUserId(boot.session.user.id)
            ) {
                return;
            }
            writeDevMockAuth(boot.session);
        }
    }, [boot.session]);

    const applySignedOutState = useCallback((): void => {
        setSession(null);
        setUser(null);
        clearDevMockAuth();
        setLiveAuthUserId(null);
    }, []);

    const restoreDevMockIfPresent = useCallback((): boolean => {
        const devUser = readDevMockUser();
        const devToken = readDevMockAccessToken();
        if (!devUser || !devToken) return false;
        if (!shouldRestoreGuestWhenServerHasNoSession()) {
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

    const applyGuestSession = useCallback((): void => {
        if (shouldKeepStoredNonGuestDevMock() && restoreDevMockIfPresent()) {
            return;
        }
        const guest = getDevMockLawyerSession();
        setSession(guest.session);
        setUser(guest.user);
        writeDevMockAuth(guest.session);
    }, [restoreDevMockIfPresent]);

    const applyGuestOrSignedOut = useCallback((): void => {
        const persisted = readPersistedSupabaseAuth();
        if (persisted.user && persisted.session && !isShellDemoUserId(persisted.user.id)) {
            setSession(persisted.session);
            setUser(persisted.user);
            return;
        }
        if (shouldKeepStoredNonGuestDevMock() && restoreDevMockIfPresent()) {
            return;
        }
        if (shouldRestoreGuestWhenServerHasNoSession()) {
            applyGuestSession();
            return;
        }
        applySignedOutState();
    }, [applyGuestSession, applySignedOutState, restoreDevMockIfPresent]);

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

    /*
     * E2E: hydrateForum يزرع hami:dev-mock-* بعد أول إقلاع؛ بلا إعادة تطبيق
     * تبقى React على ضيف الشِل وبوابة المنتدى ترفض.
     */
    useEffect(() => {
        if (import.meta.env.VITE_E2E !== '1' || typeof window === 'undefined') return;
        const w = window as Window & { __hamiE2eApplyDevMockAuth?: () => boolean };
        w.__hamiE2eApplyDevMockAuth = () => restoreDevMockIfPresent();
        return () => {
            delete w.__hamiE2eApplyDevMockAuth;
        };
    }, [restoreDevMockIfPresent]);

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        let stopWait: (() => void) | undefined;
        let cancelled = false;
        const start = () => {
            if (cancelled) return;
            void import('@/app/context/authProviderRuntime').then((runtime) => {
                if (cancelled) return;
                cleanup = runtime.startAuthSessionSync(runtimeBindings);
            });
        };
        if (isPlainDocumentSurface()) {
            stopWait = whenPlainDocumentCoverClears(start);
        } else {
            start();
        }
        return () => {
            cancelled = true;
            stopWait?.();
            cleanup?.();
        };
    }, [runtimeBindings]);

    useEffect(() => {
        let unsub: (() => void) | undefined;
        void import('@/app/services/auth/authSessionBroadcast').then((m) => {
            unsub = m.subscribeAuthLogout(() => {
                applySignedOutState();
                setLiveAuthUserId(null);
            });
        });
        return () => unsub?.();
    }, [applySignedOutState]);

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
            options?: { fullName?: string; accountType?: 'lawyer'; phone?: string },
        ) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            await runtime.authSignup(email, password, options);
        },
        [],
    );

    const registerLawyer = useCallback(
        async (input: RegisterLawyerInput) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            return runtime.authRegisterLawyer(input, runtimeBindings);
        },
        [runtimeBindings],
    );

    const registerLawyerAccount = useCallback(
        async (input: { email: string; password: string }) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            return runtime.authRegisterLawyerAccount(input, runtimeBindings);
        },
        [runtimeBindings],
    );

    const finalizeLawyerOnboarding = useCallback(
        async (input: Omit<RegisterLawyerInput, 'password'>) => {
            const runtime = await import('@/app/context/authProviderRuntime');
            return runtime.authFinalizeLawyerOnboarding(input);
        },
        [],
    );

    const enterLocalGuest = useCallback(async () => {
        const runtime = await import('@/app/context/authProviderRuntime');
        await runtime.authEnterLocalGuest(runtimeBindings);
    }, [runtimeBindings]);

    const exitGuestForAuthGate = useCallback(async (mode: 'login' | 'register') => {
        const { setPreferredAuthGateMode } = await import(
            '@/app/services/auth/authGatePreferredMode'
        );
        const { clearExplicitLocalGuest } = await import(
            '@/app/services/auth/localGuestSession'
        );
        const { clearExplicitDevUnlock } = await import(
            '@/app/services/auth/devUnlockSession'
        );
        setPreferredAuthGateMode(mode);
        clearExplicitLocalGuest();
        clearExplicitDevUnlock();
        clearDevMockAuth();
        applySignedOutState();
        setLiveAuthUserId(null);
    }, [applySignedOutState]);

    useEffect(() => {
        const onRequestGate = (event: Event) => {
            const detail = (event as CustomEvent<{ mode?: 'login' | 'register' }>).detail;
            const mode = detail?.mode === 'register' ? 'register' : 'login';
            void exitGuestForAuthGate(mode);
        };
        window.addEventListener(HAMI_REQUEST_AUTH_GATE_EVENT, onRequestGate as EventListener);
        return () =>
            window.removeEventListener(HAMI_REQUEST_AUTH_GATE_EVENT, onRequestGate as EventListener);
    }, [exitGuestForAuthGate]);

    const requestPasswordReset = useCallback(async (email: string) => {
        const runtime = await import('@/app/context/authProviderRuntime');
        return runtime.authRequestPasswordReset(email);
    }, []);

    const resendEmailConfirmation = useCallback(async (email: string) => {
        const runtime = await import('@/app/context/authProviderRuntime');
        return runtime.authResendEmailConfirmation(email);
    }, []);

    const logout = useCallback(async (options?: { skipLocalPurge?: boolean }) => {
        const runtime = await import('@/app/context/authProviderRuntime');
        const result = await runtime.authLogout(runtimeBindings, options);
        if (!result.purgeComplete) {
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.warning('أُنهيت الجلسة، لكن تعذّر مسح بعض البيانات المحلية على هذا الجهاز');
        }
        if (!result.serverOk) {
            const { SmartToast } = await import('@/app/components/ui/SmartToast');
            SmartToast.warning(
                'خرجت من هذا الجهاز. تعذّر تأكيد إنهاء الجلسة على الخادم — إن بقيت جلسة على جهاز آخر غيّر كلمة المرور',
            );
        }
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
            registerLawyer,
            registerLawyerAccount,
            finalizeLawyerOnboarding,
            enterLocalGuest,
            exitGuestForAuthGate,
            requestPasswordReset,
            resendEmailConfirmation,
            logout,
            hasRole: (role: 'lawyer' | 'admin') => userHasRole(effectiveUser, role),
            devBypassLogin,
            adminBypassLogin,
        };
    }, [
        user,
        session,
        isLoading,
        login,
        signup,
        registerLawyer,
        registerLawyerAccount,
        finalizeLawyerOnboarding,
        enterLocalGuest,
        exitGuestForAuthGate,
        requestPasswordReset,
        resendEmailConfirmation,
        logout,
        devBypassLogin,
        adminBypassLogin,
    ]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// =====================================================
// مكون حماية الصفحات
// =====================================================

interface ProtectedRouteProps {
    children: ReactNode;
    requiredRole?: 'lawyer' | 'admin';
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
