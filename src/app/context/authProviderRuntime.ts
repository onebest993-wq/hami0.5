/**
 * منطق المصادقة الثقيل — يُحمَّل ديناميكياً بعد أول paint (chunk auth-context).
 */
import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';
import { logAction } from '@/app/utils/auditLog';
import {
    clearDevMockAuth,
    hasPersistedSupabaseSession,
    purgeClientAuthResidue,
    readDevMockAccessToken,
    readDevMockUser,
    writeDevMockAuth,
} from '@/app/utils/authStorage';
import {
    attachSupabaseAuthListener,
    signInWithPassword,
    signOutSupabase,
    signUpWithPassword,
} from '@/app/utils/authSupabaseLazy';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { getDevMockLawyerSession } from '@/app/services/auth/devMockLawyerAuth';
import { prefetchLawyerDashboardEntry } from '@/app/runtime/lawyerDashboardLoader';
import { probeSameOriginApi } from '@/app/runtime/sameOriginApiProbe';
import {
    bffLogin,
    bffLogout,
    bootstrapBffCsrfSession,
    fetchBffSession,
    runBffLocalAuthMigration,
    startBffSessionKeeper,
} from '@/app/utils/bffAuthClient';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { clearCsrfSessionToken } from '@/app/security/csrfSession';
import { shouldApplyGuestFallbackSession } from '@/app/context/authBoot';

export type AuthProviderRuntimeBindings = {
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setIsLoading: (loading: boolean) => void;
    applyGuestSession: () => void;
    applySignedOutState: () => void;
    applyGuestOrSignedOut: () => void;
    restoreDevMockIfPresent: () => boolean;
};

function systemRoleForSignup(role: 'lawyer' | 'client' | 'admin'): UserRole {
    if (role === 'admin') return UserRole.SUPER_ADMIN;
    if (role === 'client') return UserRole.CLIENT;
    return UserRole.LAWYER;
}

/** مزامنة الجلسة بعد mount — BFF أو Supabase listener */
export function startAuthSessionSync(bindings: AuthProviderRuntimeBindings): () => void {
    const {
        setUser,
        setSession,
        setIsLoading,
        applyGuestOrSignedOut,
        restoreDevMockIfPresent,
    } = bindings;

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
        void probeSameOriginApi()
            .then(async (apiState) => {
                if (!mounted) return;
                if (apiState !== 'available') {
                    if (!restoreDevMockIfPresent()) {
                        applyGuestOrSignedOut();
                    }
                    setIsLoading(false);
                    return;
                }
                return runBffLocalAuthMigration()
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
                    });
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
}

export async function authLogin(
    email: string,
    password: string,
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession'>,
): Promise<void> {
    const { setUser, setSession } = bindings;
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
}

export async function authSignup(
    email: string,
    password: string,
    options?: { fullName?: string; accountType?: 'lawyer' | 'client'; phone?: string },
): Promise<void> {
    const accountType = options?.accountType ?? 'lawyer';
    const { error } = await signUpWithPassword(email, password, {
        data: {
            fullName: options?.fullName ?? '',
            phone: options?.phone ?? '',
            accountType,
        },
    });
    if (error) throw error;
}

export async function authLogout(bindings: AuthProviderRuntimeBindings): Promise<void> {
    const { applyGuestSession, applySignedOutState } = bindings;
    const keepDevMock = shouldApplyGuestFallbackSession();
    if (keepDevMock) {
        applyGuestSession();
    } else {
        purgeClientAuthResidue();
    }
    if (isBffAuthEnabled()) {
        try {
            const { SecureAPIClient } = await import('@/app/services/SecureAPIClient');
            await SecureAPIClient.fetchSecure('/api/security/csrf', { method: 'DELETE' });
        } catch {
            /* best effort */
        }
        clearCsrfSessionToken();
        await bffLogout();
        if (!keepDevMock) applySignedOutState();
        return;
    }
    await signOutSupabase();
    if (!keepDevMock) applySignedOutState();
}

async function applyMockSession(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
    params: {
        id: string;
        email: string;
        role: 'lawyer' | 'client' | 'admin';
        fullName: string;
        refreshToken: string;
    },
): Promise<void> {
    const { setUser, setSession, setIsLoading } = bindings;
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
        prefetchLawyerDashboardEntry();
    }
}

export async function authDevBypassLogin(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
): Promise<void> {
    await applyMockSession(bindings, {
        id: GUEST_LAWYER_ID,
        email: 'ahmad.demo@hami.local',
        role: 'lawyer',
        fullName: 'أحمد',
        refreshToken: 'DEV_REFRESH_TOKEN',
    });
}

export async function authAdminBypassLogin(
    bindings: Pick<AuthProviderRuntimeBindings, 'setUser' | 'setSession' | 'setIsLoading'>,
): Promise<void> {
    await applyMockSession(bindings, {
        id: 'admin-uuid-1',
        email: 'admin@local',
        role: 'admin',
        fullName: 'Dev Super Admin',
        refreshToken: 'DEV_ADMIN_REFRESH_TOKEN',
    });
}

/** خروج لـ useAppRootAuth عند غياب Provider (HMR / تقسيم حزم) */
export async function performRootAuthLogout(): Promise<void> {
    if (shouldApplyGuestFallbackSession()) {
        writeDevMockAuth(getDevMockLawyerSession().session);
        return;
    }
    purgeClientAuthResidue();
    clearCsrfSessionToken();
    await signOutSupabase().catch(() => {});
    if (isBffAuthEnabled()) await bffLogout().catch(() => {});
}
