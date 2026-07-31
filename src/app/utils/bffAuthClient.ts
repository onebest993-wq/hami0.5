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

export { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';

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
    } catch {
        /* best effort — storage encrypt may retry */
    }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
    const text = await response.text().catch(() => '');
    try {
        return JSON.parse(text) as T;
    } catch {
        return {} as T;
    }
}

export async function fetchBffSession(): Promise<User | null> {
    const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await parseJsonResponse<BffSessionResponse>(response);
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    return data.user ?? null;
}

export async function bffLogin(email: string, password: string): Promise<User> {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await parseJsonResponse<BffLoginResponse>(response);
    if (!response.ok || !data.user) {
        throw new Error(data.error ?? 'فشل تسجيل الدخول');
    }
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    return data.user;
}

export async function bffLogout(): Promise<void> {
    clearBffCryptoWrapCredential();
    await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    }).catch(() => undefined);
}

export async function bffRefreshSession(): Promise<boolean> {
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
        clearBffCryptoWrapCredential();
        return false;
    }
    const data = await parseJsonResponse<BffRefreshResponse>(response);
    await applyCryptoWrapCredential(data.cryptoWrapCredential);
    return true;
}

const BFF_REFRESH_INTERVAL_MS = 50 * 60 * 1000;

/** يجدّد access cookie + crypto wrap قبل انتهاء الجلسة (~50 دقيقة). */
export function startBffSessionKeeper(): () => void {
    if (!isBffAuthEnabled() || typeof window === 'undefined') return () => undefined;

    const tick = () => {
        void bffRefreshSession();
    };

    const intervalId = window.setInterval(tick, BFF_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
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

type WifeSignResponse = {
    ok?: boolean;
    headers?: Record<string, string>;
    error?: string;
};

/** يدمج طلبات wife-sign المتزامنة المتطابقة — nonce يُستهلك مرة واحدة لكل توقيع */
const wifeSignInflight = new Map<string, Promise<Record<string, string>>>();

function buildWifeSignInflightKey(input: {
    method: string;
    url: string;
    body: string;
    contentHash?: string;
}): string {
    return JSON.stringify({
        m: input.method.toUpperCase(),
        u: input.url,
        b: input.body,
        c: input.contentHash ?? '',
    });
}

export async function fetchBffWifeSignedHeaders(input: {
    method: string;
    url: string;
    body: string;
    contentHash?: string;
    deviceId?: string;
}): Promise<Record<string, string>> {
    const inflightKey = buildWifeSignInflightKey(input);
    const pending = wifeSignInflight.get(inflightKey);
    if (pending) return pending;

    const promise = (async (): Promise<Record<string, string>> => {
        const response = await fetch('/api/security/wife-sign', {
            method: 'POST',
            credentials: 'include',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        const data = await parseJsonResponse<WifeSignResponse>(response);
        if (!response.ok || !data.headers) {
            if (response.status === 429) {
                throw new Error('تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.');
            }
            throw new Error(data.error ?? 'WIFE signing failed');
        }
        return data.headers;
    })();

    wifeSignInflight.set(inflightKey, promise);
    try {
        return await promise;
    } finally {
        if (wifeSignInflight.get(inflightKey) === promise) {
            wifeSignInflight.delete(inflightKey);
        }
    }
}
