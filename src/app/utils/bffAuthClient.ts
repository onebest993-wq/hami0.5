import type { User } from '@supabase/supabase-js';
import { applyCsrfTokenToDocument, setCsrfSessionTokenFromServer } from '@/app/security/csrfSession';
import { CryptoService } from '@/app/services/CryptoService';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    clearBffCryptoWrapCredential,
    setBffCryptoWrapCredential,
} from '@/app/utils/bffCryptoSession';
import {
    purgeLegacyCryptoWrapSession,
    purgePersistedSupabaseJwtFromLocalStorage,
} from '@/app/utils/authStorage';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { parseJsonResponse } from '@/app/utils/bffJsonResponse';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion';

export { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';

/** تُطلق عند انتهاء جلسة BFF (401/403 من التجديد) حتى تُصفَّر الواجهة. */
export const HAMI_BFF_SESSION_LOST_EVENT = 'hami:bff-session-lost';

function nativeBffFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return getWifeNativeFetch()(input, init);
}

function isBrowserNetworkFailure(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const raw = `${error.name} ${error.message}`;
    return /failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(raw);
}

function bffDeviceHeaders(): Record<string, string> {
    const deviceId = typeof window === 'undefined' ? '' : getOrCreateDeviceId();
    return deviceId ? { 'x-wife-device-id': deviceId } : {};
}

type BffSessionResponse = {
    ok?: boolean;
    user?: User | null;
    cryptoWrapCredential?: string;
    error?: string;
};

type BffLoginResponse = {
    ok?: boolean;
    user?: User | null;
    cryptoWrapCredential?: string;
    error?: string;
};

type BffRefreshResponse = {
    ok?: boolean;
    cryptoWrapCredential?: string;
    error?: string;
};

async function applyCryptoWrapCredential(credential: string | undefined): Promise<void> {
    if (!credential?.trim()) return;
    setBffCryptoWrapCredential(credential);
    try {
        await CryptoService.initialize();
        const { default: SecureStoreService } = await import('@/app/services/SecureStoreService');
        await SecureStoreService.rewarmSensitiveAfterWrapChange();
    } catch {
        /* best effort — storage encrypt may retry */
    }
}

function notifyBffSessionLost(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(HAMI_BFF_SESSION_LOST_EVENT));
}

export async function fetchBffSession(): Promise<User | null> {
    const response = await nativeBffFetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json', ...bffDeviceHeaders() },
    });
    if (!response.ok) return null;
    const data = await parseJsonResponse<BffSessionResponse>(response);
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    return data.user ?? null;
}

export async function bffLogin(email: string, password: string): Promise<User> {
    let response: Response;
    try {
        response = await nativeBffFetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...bffDeviceHeaders(),
            },
            body: JSON.stringify({
                email,
                password,
                termsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION,
            }),
        });
    } catch (error) {
        if (isBrowserNetworkFailure(error)) {
            throw new Error('تعذّر الاتصال بالخادم — تأكد أن npm run dev يعمل ثم أعد المحاولة');
        }
        throw error;
    }
    const data = await parseJsonResponse<BffLoginResponse>(response);
    if (!response.ok || !data.user) {
        if (data.error) throw new Error(data.error);
        if (response.status >= 500) throw new Error('Auth service unavailable');
        throw new Error('فشل تسجيل الدخول');
    }
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    startBffSessionKeeper();
    return data.user;
}

type BffSignupResponse = {
    ok?: boolean;
    user?: User | null;
    userId?: string;
    sessionEstablished?: boolean;
    cryptoWrapCredential?: string;
    error?: string;
};

export type BffSignupVerification = {
    hasIdFront: boolean;
    hasIdBack: boolean;
    hasFaceSelfie: boolean;
    faceAssistOptedIn: boolean;
    idFrontPreview: string | null;
    idBackPreview?: string | null;
    faceSelfiePreview?: string | null;
};

export async function bffSignup(
    email: string,
    password: string,
    data?: Record<string, unknown>,
    verification?: BffSignupVerification,
): Promise<{ user: User | null; sessionEstablished: boolean; userId: string | null }> {
    const response = await nativeBffFetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...bffDeviceHeaders(),
        },
        body: JSON.stringify({
            email,
            password,
            data,
            verification,
            termsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION,
        }),
    });
    const payload = await parseJsonResponse<BffSignupResponse>(response);
    if (!response.ok) {
        throw new Error(payload.error ?? 'فشل إنشاء الحساب');
    }
    await applyCryptoWrapCredential(payload.cryptoWrapCredential);
    const sessionEstablished = Boolean(payload.sessionEstablished && payload.user);
    if (sessionEstablished) startBffSessionKeeper();
    const fromPayload =
        typeof payload.userId === 'string' && payload.userId.trim() ? payload.userId.trim() : null;
    const fromUser =
        payload.user && typeof payload.user.id === 'string' && payload.user.id.trim()
            ? payload.user.id.trim()
            : null;
    return {
        user: payload.user ?? null,
        sessionEstablished,
        userId: fromPayload ?? fromUser,
    };
}

export async function bffRequestPasswordReset(email: string, redirectTo?: string): Promise<string> {
    const response = await nativeBffFetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...bffDeviceHeaders(),
        },
        body: JSON.stringify({ email, redirectTo }),
    });
    const payload = await parseJsonResponse<{ ok?: boolean; message?: string; error?: string }>(
        response,
    );
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر طلب استعادة كلمة المرور');
    }
    return payload.message ?? 'إن وُجد حساب بهذا البريد فستصلك رسالة لاستعادة كلمة المرور.';
}

export async function bffResendConfirmation(email: string, redirectTo?: string): Promise<string> {
    const response = await nativeBffFetch('/api/auth/resend-confirmation', {
        method: 'POST',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            ...bffDeviceHeaders(),
        },
        body: JSON.stringify({ email, redirectTo }),
    });
    const payload = await parseJsonResponse<{ ok?: boolean; message?: string; error?: string }>(
        response,
    );
    if (!response.ok) {
        throw new Error(payload.error ?? 'تعذّر إعادة إرسال رسالة التأكيد');
    }
    return payload.message ?? 'إن وُجد حساب غير مؤكَّد بهذا البريد فستصلك رسالة تأكيد.';
}

export async function bffLogout(): Promise<boolean> {
    stopBffSessionKeeper();
    clearBffCryptoWrapCredential();
    try {
        const { CryptoService } = await import('@/app/services/CryptoService');
        CryptoService.destroy();
    } catch {
        /* ignore */
    }
    try {
        const response = await nativeBffFetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
                Accept: 'application/json',
                ...bffDeviceHeaders(),
            },
        });
        /* 401: الجلسة منتهية أصلاً — الكوكي قد يُمسَح في الجواب */
        return response.ok || response.status === 401;
    } catch {
        return false;
    }
}

export async function bffRefreshSession(): Promise<boolean> {
    const response = await nativeBffFetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', ...bffDeviceHeaders() },
    });
    if (response.status === 401 || response.status === 403) {
        clearBffCryptoWrapCredential();
        stopBffSessionKeeper();
        notifyBffSessionLost();
        return false;
    }
    if (!response.ok) {
        return false;
    }
    const data = await parseJsonResponse<BffRefreshResponse>(response);
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    return true;
}

const BFF_REFRESH_INTERVAL_MS = 50 * 60 * 1000;
const BFF_REFRESH_DEBOUNCE_MS = 8_000;

let keeperIntervalId: number | null = null;
let keeperOnVisible: (() => void) | null = null;
let keeperOnOnline: (() => void) | null = null;
let lastRefreshAt = 0;

export function stopBffSessionKeeper(): void {
    if (typeof window === 'undefined') return;
    if (keeperIntervalId != null) {
        window.clearInterval(keeperIntervalId);
        keeperIntervalId = null;
    }
    if (keeperOnVisible) {
        window.removeEventListener('visibilitychange', keeperOnVisible);
        keeperOnVisible = null;
    }
    if (keeperOnOnline) {
        window.removeEventListener('online', keeperOnOnline);
        keeperOnOnline = null;
    }
}

function tickBffRefresh(): void {
    const now = Date.now();
    if (now - lastRefreshAt < BFF_REFRESH_DEBOUNCE_MS) return;
    lastRefreshAt = now;
    void bffRefreshSession();
}

/** يجدّد access cookie + crypto wrap قبل انتهاء الجلسة (~50 دقيقة). أوحد — لا فترات متداخلة. */
export function startBffSessionKeeper(): () => void {
    if (!isBffAuthEnabled() || typeof window === 'undefined') return () => undefined;
    if (keeperIntervalId != null) return stopBffSessionKeeper;

    keeperOnVisible = () => {
        if (document.visibilityState === 'visible') tickBffRefresh();
    };
    keeperOnOnline = () => tickBffRefresh();
    window.addEventListener('visibilitychange', keeperOnVisible);
    window.addEventListener('online', keeperOnOnline);
    keeperIntervalId = window.setInterval(tickBffRefresh, BFF_REFRESH_INTERVAL_MS);
    return stopBffSessionKeeper;
}

export function resetBffSessionKeeperForTests(): void {
    stopBffSessionKeeper();
    lastRefreshAt = 0;
}

export async function bootstrapBffCsrfSession(): Promise<void> {
    if (!isBffAuthEnabled()) return;
    try {
        const res = await SecureAPIClient.fetchSecure<{ ok?: boolean; csrfToken?: string }>(
            '/api/security/csrf',
            { method: 'GET' },
        );
        if (res?.ok && res.csrfToken) {
            setCsrfSessionTokenFromServer(res.csrfToken);
            applyCsrfTokenToDocument(res.csrfToken);
        }
    } catch {
        /* offline / dev */
    }
}

/**
 * ترحيل one-shot: إزالة JWT من localStorage + wrap key القديم عند تفعيل BFF.
 * المستخدم الذي كان مسجلاً بـ JWT فقط يحتاج login مرة واحدة عبر BFF.
 */
export async function runBffLocalAuthMigration(): Promise<void> {
    if (!isBffAuthEnabled()) return;

    const purgedJwt = purgePersistedSupabaseJwtFromLocalStorage();
    const purgedCryptoWrap = purgeLegacyCryptoWrapSession();

    if (!purgedJwt && !purgedCryptoWrap) return;

    clearBffCryptoWrapCredential();

    try {
        CryptoService.destroy();
    } catch {
        /* ignore */
    }

    if (purgedJwt) {
        const { signOutSupabase } = await import('@/app/utils/authSupabaseLazy');
        await signOutSupabase();
    }
}
