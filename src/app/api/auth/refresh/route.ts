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
import { getWifeUserRestrictionLive } from '../../security/wifeUserStatus.ts';
import { accountLoginDeniedPayload } from '../../security/accountRestrictionCopy.ts';
import { resolveGoTrueUserId, revokeGoTrueSession } from '../goTrueSession.ts';
import { recordHeadquartersConnectionSignal } from '../../security/headquartersConnectionSignal.ts';

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

/** POST /api/auth/refresh — يجدّد access token من refresh cookie. */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return jsonRefreshError(request, 503, 'Auth not configured', false);
    }

    const refreshToken = readRefreshTokenFromRequest(request);
    if (!refreshToken) {
        return jsonRefreshError(request, 401, 'No refresh session', false);
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
