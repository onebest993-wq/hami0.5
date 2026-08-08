import {
    buildAccessSetCookie,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';

const LOGIN_WINDOW_MS = 10 * 60_000;
/** العنوان يوقف تجريب حسابات كثيرة من مصدر واحد، والبريد يوقف رشّ كلمات المرور على حساب واحد. */
const LOGIN_MAX_PER_IP = 30;
const LOGIN_MAX_PER_EMAIL = 10;

function readClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const firstHop = forwarded?.split(',')[0]?.trim();
    return firstHop || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

/**
 * الرفض عند تعذّر المخزن كان سيمنع كل المستخدمين من الدخول عند انقطاع Redis،
 * فيسقط هذا المسار إلى عدّاد الذاكرة بدلاً من الإقفال الكامل.
 */
function consumeLoginSlot(subject: string, scope: string, maxRequests: number): Promise<boolean> {
    return consumeRateLimitSlot(subject, {
        scope,
        maxRequests,
        windowMs: LOGIN_WINDOW_MS,
        fallbackToMemory: true,
    });
}

function tooManyAttempts(): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error: 'Too many login attempts' }), {
            status: 429,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Retry-After': String(Math.ceil(LOGIN_WINDOW_MS / 1000)),
            },
        }),
    );
}

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

    if (!(await consumeLoginSlot(readClientIp(request), 'auth-login-ip', LOGIN_MAX_PER_IP))) {
        return tooManyAttempts();
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

    if (!(await consumeLoginSlot(email.toLowerCase(), 'auth-login-email', LOGIN_MAX_PER_EMAIL))) {
        return tooManyAttempts();
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
