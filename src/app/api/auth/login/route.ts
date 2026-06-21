import {
    buildAccessSetCookie,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';

type SupabaseAuthTokenResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: Record<string, unknown>;
    error_description?: string;
    msg?: string;
};

/** POST /api/auth/login — يضبط HttpOnly cookies ولا يُرجع JWT للعميل. */
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

    let email = '';
    let password = '';
    try {
        const body = (await request.json()) as { email?: unknown; password?: unknown };
        email = typeof body.email === 'string' ? body.email.trim() : '';
        password = typeof body.password === 'string' ? body.password : '';
    } catch {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    if (!email || !password) {
        return applyWifeSecurityHeaders(
            new Response(JSON.stringify({ ok: false, error: 'Email and password required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
            }),
        );
    }

    let authData: SupabaseAuthTokenResponse;
    try {
        const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                apikey: cfg.key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        authData = (await res.json()) as SupabaseAuthTokenResponse;
        if (!res.ok || !authData.access_token || !authData.refresh_token) {
            const message = authData.error_description ?? authData.msg ?? 'Invalid credentials';
            return applyWifeSecurityHeaders(
                new Response(JSON.stringify({ ok: false, error: message }), {
                    status: 401,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
    headers.append('Set-Cookie', buildRefreshSetCookie(authData.refresh_token, secure));

    const cryptoWrapCredential = await deriveClientCryptoWrapCredential(authData.access_token);

    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: true, user: authData.user ?? null, cryptoWrapCredential }), {
            status: 200,
            headers,
        }),
    );
}
