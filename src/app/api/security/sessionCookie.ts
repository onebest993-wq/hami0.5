/**
 * HttpOnly session cookies — BFF auth (JWT لا يُخزَّن في localStorage).
 */

export const ACCESS_COOKIE_NAME = 'hami_access_token';
export const REFRESH_COOKIE_NAME = 'hami_refresh_token';

export const ACCESS_COOKIE_MAX_AGE_SEC = 60 * 60;
export const REFRESH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function isSecureRequest(request: Request): boolean {
    return (
        request.url.startsWith('https://') ||
        (request.headers.get('x-forwarded-proto') ?? '').toLowerCase() === 'https'
    );
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!cookieHeader) return out;
    for (const part of cookieHeader.split(';')) {
        const idx = part.indexOf('=');
        if (idx <= 0) continue;
        const name = part.slice(0, idx).trim();
        const value = part.slice(idx + 1).trim();
        if (name) out[name] = value;
    }
    return out;
}

export function parseAccessCookie(cookieHeader: string | null): string | null {
    const raw = parseCookieHeader(cookieHeader)[ACCESS_COOKIE_NAME]?.trim();
    if (!raw) return null;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

export function parseRefreshCookie(cookieHeader: string | null): string | null {
    const raw = parseCookieHeader(cookieHeader)[REFRESH_COOKIE_NAME]?.trim();
    if (!raw) return null;
    try {
        return decodeURIComponent(raw);
    } catch {
        return raw;
    }
}

function buildSetCookie(name: string, value: string, maxAgeSec: number, secure: boolean): string {
    const flags = [
        `${name}=${encodeURIComponent(value)}`,
        'Path=/',
        'SameSite=Strict',
        'HttpOnly',
        `Max-Age=${maxAgeSec}`,
    ];
    if (secure) flags.push('Secure');
    return flags.join('; ');
}

function buildClearCookie(name: string, secure: boolean): string {
    const flags = [`${name}=`, 'Path=/', 'SameSite=Strict', 'HttpOnly', 'Max-Age=0'];
    if (secure) flags.push('Secure');
    return flags.join('; ');
}

export function buildAccessSetCookie(token: string, secure: boolean, maxAgeSec = ACCESS_COOKIE_MAX_AGE_SEC): string {
    return buildSetCookie(ACCESS_COOKIE_NAME, token, maxAgeSec, secure);
}

export function buildRefreshSetCookie(token: string, secure: boolean, maxAgeSec = REFRESH_COOKIE_MAX_AGE_SEC): string {
    return buildSetCookie(REFRESH_COOKIE_NAME, token, maxAgeSec, secure);
}

export function buildClearSessionCookies(secure: boolean): string[] {
    return [buildClearCookie(ACCESS_COOKIE_NAME, secure), buildClearCookie(REFRESH_COOKIE_NAME, secure)];
}

export function getSupabaseAuthConfigFromEnv(): { url: string; key: string } | null {
    const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
    const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();
    if (!supabaseUrl || !supabaseKey) return null;
    return { url: supabaseUrl.replace(/\/+$/, ''), key: supabaseKey };
}
