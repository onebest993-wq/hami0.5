import {
    buildAccessSetCookie,
    buildRefreshSetCookie,
    getSupabaseAuthConfigFromEnv,
    isSecureRequest,
} from '../../security/sessionCookie.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { deriveClientCryptoWrapCredential } from '../../security/cryptoWrapServer.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import {
    ensureLawyerProfileRow,
    getWifeUserRestrictionLive,
} from '../../security/wifeUserStatus.ts';
import { accountLoginDeniedPayload } from '../../security/accountRestrictionCopy.ts';
import {
    extractDeviceIdFromRequest,
    registerTokenSessionServer,
} from '../../security/stolenTokenServer.ts';
import { readGoTrueUserId, resolveGoTrueUserId, revokeGoTrueSession } from '../goTrueSession.ts';
import { readTermsVersionFromBody, termsVersionRejectedResponse } from '../legalTermsRequest.ts';
import { stampLegalTermsAcceptance } from '../stampLegalTermsAcceptance.ts';
import { recordHeadquartersConnectionSignal } from '../../security/headquartersConnectionSignal.ts';

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

function jsonAuthError(status: number, error: string, code?: string): Response {
    return applyWifeSecurityHeaders(
        new Response(JSON.stringify({ ok: false, error, ...(code ? { code } : {}) }), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
    );
}

function mapGoTrueLoginFailure(raw: string): { error: string; status: number } {
    const message = raw.trim();
    if (/email not confirmed/i.test(message)) {
        return { error: 'Email not confirmed', status: 401 };
    }
    return { error: 'Invalid credentials', status: 401 };
}

type SupabaseAuthTokenResponse = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: Record<string, unknown>;
    error_description?: string;
    msg?: string;
    error?: string;
};

function readSeedAccountType(_user: Record<string, unknown> | undefined): 'lawyer' {
    void _user;
    return 'lawyer';
}

function readAppVerificationStatus(user: Record<string, unknown> | undefined): unknown {
    const app = user?.app_metadata;
    if (!app || typeof app !== 'object' || Array.isArray(app)) return undefined;
    return (app as { verification_status?: unknown }).verification_status;
}

/** POST /api/auth/login — يضبط HttpOnly cookies ولا يُرجع JWT للعميل. */
export async function POST(request: Request): Promise<Response> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) {
        return jsonAuthError(503, 'Auth not configured');
    }

    if (!(await consumeLoginSlot(readClientIp(request), 'auth-login-ip', LOGIN_MAX_PER_IP))) {
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

    let email = '';
    let password = '';
    let termsVersion = '';
    try {
        const body = (await request.json()) as Record<string, unknown>;
        email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        password = typeof body.password === 'string' ? body.password : '';
        termsVersion = readTermsVersionFromBody(body);
    } catch {
        return jsonAuthError(400, 'Invalid JSON body');
    }

    const termsRejected = termsVersionRejectedResponse(termsVersion);
    if (termsRejected) return termsRejected;

    if (!email.includes('@') || !password) {
        return jsonAuthError(400, 'Email and password required');
    }

    if (!(await consumeLoginSlot(email, 'auth-login-email', LOGIN_MAX_PER_EMAIL))) {
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
            const mapped = mapGoTrueLoginFailure(
                authData.error_description ?? authData.msg ?? authData.error ?? '',
            );
            return jsonAuthError(mapped.status, mapped.error);
        }
    } catch {
        return jsonAuthError(503, 'Auth service unavailable');
    }

    const resolvedUserId = await resolveGoTrueUserId(authData.access_token, authData.user);
    if (!resolvedUserId) {
        await revokeGoTrueSession(authData.access_token);
        return jsonAuthError(503, 'Auth service unavailable');
    }
    if (!readGoTrueUserId(authData.user)) {
        authData.user = { ...(authData.user ?? {}), id: resolvedUserId };
    }

    const restriction = await getWifeUserRestrictionLive(resolvedUserId);
    if (!restriction.loginAllowed) {
        await revokeGoTrueSession(authData.access_token);
        const denied = accountLoginDeniedPayload(restriction);
        return jsonAuthError(403, denied.error, denied.code);
    }
    await ensureLawyerProfileRow(resolvedUserId, readSeedAccountType(authData.user));
    try {
        const { ensurePendingLawyerVerificationKv } = await import(
            '../lawyer-verification/ensurePendingLawyerVerificationKv.ts'
        );
        const loginEmail =
            typeof authData.user?.email === 'string' ? authData.user.email.trim() : '';
        await ensurePendingLawyerVerificationKv({
            userId: resolvedUserId,
            email: loginEmail,
            appVerificationStatus: readAppVerificationStatus(authData.user),
        });
    } catch {
        /* أفضل جهد — طابور المقر يزرع الصف عند الفتح */
    }
    await stampLegalTermsAcceptance(resolvedUserId);
    void recordHeadquartersConnectionSignal(resolvedUserId, request, 'login');

    const deviceId = extractDeviceIdFromRequest(request);
    if (deviceId) {
        await registerTokenSessionServer(authData.access_token, deviceId).catch(() => false);
    }

    const secure = isSecureRequest(request);
    const maxAge =
        typeof authData.expires_in === 'number' && authData.expires_in > 0
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
