import type { Session, User } from '@supabase/supabase-js';
import {
    clearDevMockAuth,
    readDevMockAccessToken,
    readDevMockUser,
    readPersistedSupabaseAuth,
} from '@/app/utils/authStorage';
import { getDevMockLawyerSession } from '@/app/services/auth/devMockLawyerAuth';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    createDevUnlockLawyerSession,
    isExplicitDevUnlock,
} from '@/app/services/auth/devUnlockSession';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { isShellAuthBypassed, isShellDemoUserId } from '@/app/services/auth/shellAuth';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';

export type AuthBootState = { user: User | null; session: Session | null };

const EMPTY_AUTH: AuthBootState = { user: null, session: null };

function explicitLocalGuestBootState(): AuthBootState | null {
    if (!isExplicitLocalGuest()) return null;
    const devUser = readDevMockUser();
    const devToken = readDevMockAccessToken();
    if (devUser?.id === GUEST_LAWYER_ID && devToken) {
        return {
            user: devUser,
            session: {
                access_token: devToken,
                token_type: 'bearer',
                expires_in: 60 * 60 * 24 * 365,
                expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
                refresh_token: 'GUEST_REFRESH_TOKEN',
                user: devUser,
            } as Session,
        };
    }
    return getDevMockLawyerSession();
}

/**
 * جلسة mock للتطوير فقط عند فتح الشِل صراحةً.
 * مع بوابة الدخول المغلقة: امسح ضيفاً قديماً من التخزين حتى لا تُتخطى الشاشة.
 */
function devMockBootState(): AuthBootState | null {
    const devUser = readDevMockUser();
    const devToken = readDevMockAccessToken();
    if (!devUser || !devToken) return null;

    if (!isShellAuthBypassed()) {
        if (isExplicitLocalGuest() && isShellDemoUserId(devUser.id)) {
            return {
                user: devUser,
                session: {
                    access_token: devToken,
                    token_type: 'bearer',
                    expires_in: 60 * 60 * 24 * 365,
                    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
                    refresh_token: 'GUEST_REFRESH_TOKEN',
                    user: devUser,
                } as Session,
            };
        }
        if (isShellDemoUserId(devUser.id)) {
            clearDevMockAuth();
        }
        return null;
    }

    return {
        user: devUser,
        session: {
            access_token: devToken,
            token_type: 'bearer',
            expires_in: 60 * 60,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
            refresh_token: 'DEV_REFRESH_TOKEN',
            user: devUser,
        } as Session,
    };
}

function explicitDevUnlockBootState(): AuthBootState | null {
    if (!isExplicitDevUnlock()) return null;
    const persistedDev = devMockBootState();
    if (persistedDev) return persistedDev;
    return createDevUnlockLawyerSession();
}

/** حالة المصادقة الأولية — بدون ضيف تلقائي إلا بتجاوز صريح أو دخول بدون تسجيل */
export function resolveInitialAuthState(): AuthBootState {
    if (isBffAuthEnabled()) {
        const unlocked = explicitDevUnlockBootState();
        if (unlocked) return unlocked;
        if (isShellAuthBypassed()) return getDevMockLawyerSession();
        const localGuest = explicitLocalGuestBootState();
        if (localGuest) return localGuest;
        return EMPTY_AUTH;
    }

    const persisted = readPersistedSupabaseAuth();
    if (persisted.user && persisted.session && !isShellDemoUserId(persisted.user.id)) {
        return { user: persisted.user, session: persisted.session };
    }
    if (persisted.user && isShellDemoUserId(persisted.user.id) && !isShellAuthBypassed()) {
        if (!isExplicitLocalGuest()) {
            clearDevMockAuth();
        }
    }

    const localGuest = explicitLocalGuestBootState();
    if (localGuest) return localGuest;

    const unlocked = explicitDevUnlockBootState();
    if (unlocked) return unlocked;

    const devMock = devMockBootState();
    if (devMock) return devMock;

    return isShellAuthBypassed() ? getDevMockLawyerSession() : EMPTY_AUTH;
}

/**
 * BFF لا يقرأ الجلسة من localStorage (كوكي HttpOnly).
 * بلا مستخدم في الإقلاع نُبقي الشاشة صامتة حتى ردّ /api/auth/session — وإلا تومض بوابة الدخول.
 */
export function shouldHoldAuthGateUntilSessionProbe(boot: AuthBootState): boolean {
    if (boot.user) return false;
    if (!isBffAuthEnabled()) return false;
    if (isShellAuthBypassed() || isExplicitLocalGuest() || isExplicitDevUnlock()) return false;
    return true;
}

/** محامٍ مخزَّن في mock التطوير — لا يُستبدل بضيف عند سقوط جلسة الخادم */
export function shouldKeepStoredNonGuestDevMock(): boolean {
    const user = readDevMockUser();
    return Boolean(user?.id && !isShellDemoUserId(user.id) && readDevMockAccessToken());
}

/** بعد تسجيل الخروج — أبقِ الضيف فقط عند VITE_SHELL_AUTH_OPEN، لا عند «دخول كمطور» */
export function shouldApplyGuestFallbackSession(): boolean {
    return import.meta.env.VITE_SHELL_AUTH_OPEN === 'true';
}

/**
 * عند ردّ الخادم بلا جلسة: أبقِ الضيف المحلي أو جلسة المطوّر إن اختارها المستخدم.
 * لا يُستخدم عند تسجيل خروج صريح (يُمسح العلم أولاً).
 */
export function shouldRestoreGuestWhenServerHasNoSession(): boolean {
    return isShellAuthBypassed() || isExplicitLocalGuest() || isExplicitDevUnlock();
}
