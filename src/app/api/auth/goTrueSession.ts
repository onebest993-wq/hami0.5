import { decodeJwtPayloadBase64 } from '@/app/security/jwtFields.ts';
import { getSupabaseAuthConfigFromEnv } from '../security/sessionCookie.ts';

export function readGoTrueUserId(user: Record<string, unknown> | null | undefined): string {
    const id = user?.id;
    return typeof id === 'string' ? id.trim() : '';
}

/** `sub` من JWT الصادر — لا يُعتمد كتفويض وحده؛ يُستخدم لتعيين الهوية بعد منح GoTrue. */
export function readAccessTokenSubject(accessToken: string): string {
    const payload = decodeJwtPayloadBase64(accessToken);
    const sub = payload && typeof payload.sub === 'string' ? payload.sub.trim() : '';
    return sub;
}

export async function fetchGoTrueUser(accessToken: string): Promise<Record<string, unknown> | null> {
    const token = accessToken.trim();
    if (!token) return null;
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return null;
    try {
        const res = await fetch(`${cfg.url}/auth/v1/user`, {
            headers: {
                apikey: cfg.key,
                Authorization: `Bearer ${token}`,
            },
        });
        if (!res.ok) return null;
        const user = (await res.json()) as Record<string, unknown>;
        return user && typeof user === 'object' ? user : null;
    } catch {
        return null;
    }
}

/**
 * هوية المستخدم بعد منح توكن صالح.
 * الترتيب: جسم المنح → JWT sub → GET /auth/v1/user. فراغ = لا تُصدَر كوكيز.
 */
export async function resolveGoTrueUserId(
    accessToken: string,
    user?: Record<string, unknown> | null,
): Promise<string> {
    const fromUser = readGoTrueUserId(user);
    if (fromUser) return fromUser;
    const fromJwt = readAccessTokenSubject(accessToken);
    if (fromJwt) return fromJwt;
    const fetched = await fetchGoTrueUser(accessToken);
    return readGoTrueUserId(fetched);
}

/**
 * يُبطل جلسة GoTrue الحالية (refresh token) — أفضل جهد.
 * مسح الكوكي وحده لا يلغي الرمز عند المُصدِر.
 */
export async function revokeGoTrueSession(
    accessToken: string | null | undefined,
    options?: { scope?: 'local' | 'global' },
): Promise<void> {
    const token = typeof accessToken === 'string' ? accessToken.trim() : '';
    if (!token) return;
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return;
    const scope = options?.scope === 'local' ? 'local' : 'global';
    try {
        await fetch(`${cfg.url}/auth/v1/logout?scope=${scope}`, {
            method: 'POST',
            headers: {
                apikey: cfg.key,
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
    } catch {
        /* الشبكة أو الإعداد — الكوكي يُمسح على أي حال */
    }
}
