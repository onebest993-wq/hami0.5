import { getWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import { isHeadquartersMasterMailbox } from '@/app/services/admin/adminHqIdentity';
import { bffRefreshSession } from '@/app/utils/bffAuthClient';

export type HeadquartersAdminVerifyResult = {
    ok?: boolean;
    isAdmin?: boolean;
    sessionLive: boolean;
    userId?: string;
    reason?: string;
    profileRole?: string | null;
    uuidMatches?: boolean;
};

type SessionPayload = {
    ok?: boolean;
    isAdmin?: boolean;
    user?: { id?: unknown; email?: unknown } | null;
};

function nativeGet(path: string): Promise<Response> {
    return getWifeNativeFetch()(path, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
}

function readSessionAdmin(data: SessionPayload): HeadquartersAdminVerifyResult | null {
    const user = data.user;
    if (!user || typeof user !== 'object') return null;
    const userId = typeof user.id === 'string' && user.id.trim() ? user.id.trim() : undefined;
    const email = typeof user.email === 'string' ? user.email : null;
    if (!userId && !email) return null;
    const isAdmin = data.isAdmin === true || isHeadquartersMasterMailbox(email);
    return {
        ok: true,
        sessionLive: true,
        isAdmin,
        userId,
        reason: data.isAdmin === true ? 'session_flag' : isAdmin ? 'session_email' : 'not_admin',
    };
}

async function readLiveSession(): Promise<HeadquartersAdminVerifyResult | null | 'anonymous'> {
    const sessionRes = await nativeGet('/api/auth/session');
    if (!sessionRes.ok) return null;
    const session = (await sessionRes.json()) as SessionPayload;
    const parsed = readSessionAdmin(session);
    if (parsed) return parsed;
    if (session.ok === true && (session.user == null || typeof session.user !== 'object')) {
        return 'anonymous';
    }
    return null;
}

/**
 * مصدر الدخول: جلسة HttpOnly الحية فقط.
 * لا نفتح المقر من بريد الواجهة عندما يرفض الخادم الكوكي.
 */
export async function fetchHeadquartersAdminVerify(): Promise<HeadquartersAdminVerifyResult> {
    const first = await readLiveSession();
    if (first === 'anonymous') {
        return { ok: false, isAdmin: false, sessionLive: false, reason: 'no_live_session' };
    }
    if (first) return first;

    const refreshed = await bffRefreshSession().catch(() => false);
    if (refreshed) {
        const afterRefresh = await readLiveSession();
        if (afterRefresh === 'anonymous') {
            return { ok: false, isAdmin: false, sessionLive: false, reason: 'no_live_session' };
        }
        if (afterRefresh) return afterRefresh;
    }

    const res = await nativeGet('/api/admin/verify');
    if (res.ok) {
        const data = (await res.json()) as Omit<HeadquartersAdminVerifyResult, 'sessionLive'>;
        return { ...data, sessionLive: true };
    }
    if (res.status === 401 || res.status === 403) {
        return { ok: false, isAdmin: false, sessionLive: false, reason: 'no_live_session' };
    }
    throw new Error(`admin_verify_${res.status}`);
}
