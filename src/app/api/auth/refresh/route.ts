import {
    buildAccessSetCookie,
    buildClearSessionCookies,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
    readRefreshTokenFromRequest,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { getWifeUserRestrictionLive } from '../../security/wifeUserStatus.ts';
import { accountLoginDeniedPayload } from '../../security/accountRestrictionCopy.ts';
import { resolveGoTrueUserId, revokeGoTrueSession } from '../goTrueSession.ts';
import { recordHeadquartersConnectionSignal } from '../../security/headquartersConnectionSignal.ts';

const REFRESH_WINDOW_MS = 10 * 60_000;
/**
 * العميل الشرعي يجدّد مرة كل ~50 دقيقة، والذيل مرتبط بالبطاقة نفسها فيقيّد الإعادة.
 * سقف العنوان مرتفع لأن شبكات الهاتف العراقية تشترك في IP واحد (CGNAT).
 */
const REFRESH_MAX_PER_TOKEN = 30;
const REFRESH_MAX_PER_IP = 600;

function readClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstHop = forwarded?.split(',')[0]?.trim();
    return firstHop || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

type SupabaseRefreshResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: Record<string, unknown>;
    error_description?: string;
    msg?: string;
};

function jsonRefreshError(
    request: Request,
    status: number,
    error: string,
    clearCookies: boolean,
    code?: string,
): Response {
    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    if (clearCookies) {
        const secure = isSecureRequest(request);
        for (const cookie of buildClearSessionCookies(secure)) {
            headers.append('Set-Cookie', cookie);
        }
    }
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error, ...(code ? { code } : {}) }), { status, headers }),
    );
}

/** 429 لا يمسح الكوكيز: الجلسة سليمة والعميل يعيد المحاولة في الدورة التالية. */
function refreshThrottledResponse(): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error: 'Too many refresh attempts' }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Retry-After': String(Math.ceil(REFRESH_WINDOW_MS / 1000)),
            },
        }),
    );
}

/** POST /api/auth/refresh — يجدّد access token من refresh cookie. */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return jsonRefreshError(request, 503, 'Auth not configured', false);
    }

    if (
        !(await consumeRateLimitSlot(readClientIp(request), {
            scope: 'auth-refresh-ip',
            maxRequests: REFRESH_MAX_PER_IP,
            windowMs: REFRESH_WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return refreshThrottledResponse();
    }

    const refreshToken = readRefreshTokenFromRequest(request);
    if (!refreshToken) {
        return jsonRefreshError(request, 401, 'No refresh session', false);
    }

    if (
        !(await consumeRateLimitSlot(refreshToken, {
            scope: 'auth-refresh-token',
            maxRequests: REFRESH_MAX_PER_TOKEN,
            windowMs: REFRESH_WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return refreshThrottledResponse();
    }

    let authData: SupabaseRefreshResponse;
    try {
        const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                apikey: cfg.key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        authData = (await res.json()) as SupabaseRefreshResponse;
        if (!res.ok || !authData.access_token) {
            return jsonRefreshError(request, 401, 'Session expired', true);
        }
    } catch {
        return jsonRefreshError(request, 503, 'Auth service unavailable', false);
    }

    const userId = await resolveGoTrueUserId(authData.access_token, authData.user);
    if (!userId) {
        await revokeGoTrueSession(authData.access_token);
        return jsonRefreshError(request, 401, 'Session expired', true);
    }
    const restriction = await getWifeUserRestrictionLive(userId);
    if (!restriction.loginAllowed) {
        await revokeGoTrueSession(authData.access_token);
        const denied = accountLoginDeniedPayload(restriction);
        return jsonRefreshError(request, 403, denied.error, true, denied.code);
    }
    void recordHeadquartersConnectionSignal(userId, request, 'refresh');

    const secure = isSecureRequest(request);
    const maxAge =
        typeof authData.expires_in === 'number' && authData.expires_in > 0
            ? authData.expires_in
            : undefined;

    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
    headers.append('Set-Cookie', buildAccessSetCookie(authData.access_token, secure, maxAge));
    if (authData.refresh_token) {
        headers.append('Set-Cookie', buildRefreshSetCookie(authData.refresh_token, secure));
    }

    const cryptoWrapCredential = await deriveClientCryptoWrapCredential(authData.access_token);

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, cryptoWrapCredential }), { status: 200, headers }),
    );
}
