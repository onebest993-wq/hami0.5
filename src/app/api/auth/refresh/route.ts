import {
    buildAccessSetCookie,
    buildClearSessionCookies,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
    parseRefreshCookie,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';

type SupabaseRefreshResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
    msg?: string;
};

/** POST /api/auth/refresh — يجدّد access token من refresh cookie. */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Auth not configured' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const refreshToken = parseRefreshCookie(request.headers.get('cookie'));
    if (!refreshToken) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'No refresh session' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
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
            const secure = isSecureRequest(request);
            const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
            for (const cookie of buildClearSessionCookies(secure)) {
                headers.append('Set-Cookie', cookie);
            }
            return applyWifeSecurityHeaders(
                new Response(JSON.stringify({ ok: false, error: 'Session expired' }), {
                    status: 401,
                    headers,
                }),
            );
        }
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Auth service unavailable' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    const secure = isSecureRequest(request);
    const maxAge = typeof authData.expires_in === 'number' && authData.expires_in > 0
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
