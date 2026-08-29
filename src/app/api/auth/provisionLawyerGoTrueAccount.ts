import { readSupabasePrivilegedKey } from '../security/supabasePrivilegedEnv.ts';

export const SIGNUP_MAIL_RATE_LIMIT_AR =
    'تعذّر إكمال التسجيل لأن حد رسائل Auth ممتلئ. انتظر نحو ساعة ثم أعد المحاولة مرة واحدة.';

export const SIGNUP_DUPLICATE_AR =
    'هذا البريد مسجّل مسبقاً — سجّل الدخول أو استخدم استعادة كلمة المرور';

export type LawyerGoTrueProvision =
    | {
          ok: true;
          user: Record<string, unknown>;
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
      }
    | {
          ok: false;
          status: 400 | 409 | 429 | 503;
          code: 'EMAIL_ALREADY_REGISTERED' | 'SIGNUP_FAILED' | 'EMAIL_RATE_LIMIT' | 'AUTH_UNAVAILABLE';
          error: string;
      };

type GoTrueBody = {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: Record<string, unknown>;
    id?: string;
    email?: string;
    error_description?: string;
    msg?: string;
    message?: string;
    error?: string;
    error_code?: string;
    code?: string;
};

function readGoTrueMessage(data: GoTrueBody, fallback: string): string {
    for (const value of [data.error_description, data.msg, data.message, data.error]) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return fallback;
}

function isDuplicateIdentity(message: string, status: number): boolean {
    return (
        status === 422 ||
        /already\s+registered|already\s+exists|duplicate|user.?exists|email_exists/i.test(message)
    );
}

function isEmailRateLimit(message: string, status: number, code?: string): boolean {
    if (status === 429) return true;
    if ((code ?? '').toLowerCase() === 'over_email_send_rate_limit') return true;
    return /rate limit|too many requests/i.test(message);
}

function failFromGoTrue(data: GoTrueBody, status: number): Extract<LawyerGoTrueProvision, { ok: false }> {
    const message = readGoTrueMessage(data, 'Signup failed');
    const code = data.error_code ?? data.code;
    if (isEmailRateLimit(message, status, code)) {
        return {
            ok: false,
            status: 429,
            code: 'EMAIL_RATE_LIMIT',
            error: SIGNUP_MAIL_RATE_LIMIT_AR,
        };
    }
    if (isDuplicateIdentity(message, status)) {
        return {
            ok: false,
            status: 409,
            code: 'EMAIL_ALREADY_REGISTERED',
            error: SIGNUP_DUPLICATE_AR,
        };
    }
    return {
        ok: false,
        status: status === 503 ? 503 : 400,
        code: status === 503 ? 'AUTH_UNAVAILABLE' : 'SIGNUP_FAILED',
        error: status === 503 ? 'Auth service unavailable' : 'Signup failed',
    };
}

function userFromAdminPayload(data: GoTrueBody): Record<string, unknown> | null {
    if (data.user && typeof data.user === 'object') return data.user;
    if (typeof data.id === 'string' && data.id.trim()) {
        return { id: data.id.trim(), email: data.email };
    }
    return null;
}

async function grantPasswordSession(
    url: string,
    anonKey: string,
    email: string,
    password: string,
): Promise<Pick<GoTrueBody, 'access_token' | 'refresh_token' | 'expires_in' | 'user'>> {
    const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            apikey: anonKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) return {};
    return (await res.json()) as GoTrueBody;
}

async function provisionViaAdmin(
    url: string,
    serviceKey: string,
    anonKey: string,
    email: string,
    password: string,
    meta: Record<string, unknown>,
): Promise<LawyerGoTrueProvision> {
    const res = await fetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            user_metadata: meta,
        }),
    });
    const data = (await res.json().catch(() => ({}))) as GoTrueBody;
    if (!res.ok) return failFromGoTrue(data, res.status);

    const user = userFromAdminPayload(data);
    if (!user) {
        return { ok: false, status: 400, code: 'SIGNUP_FAILED', error: 'Signup failed' };
    }

    const session = await grantPasswordSession(url, anonKey, email, password);
    return {
        ok: true,
        user: session.user ?? user,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
    };
}

async function provisionViaPublicSignup(
    url: string,
    anonKey: string,
    email: string,
    password: string,
    meta: Record<string, unknown>,
): Promise<LawyerGoTrueProvision> {
    const res = await fetch(`${url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            apikey: anonKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email,
            password,
            data: meta,
        }),
    });
    const data = (await res.json().catch(() => ({}))) as GoTrueBody;
    if (!res.ok) return failFromGoTrue(data, res.status);
    return {
        ok: true,
        user: data.user ?? {},
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
    };
}

/**
 * إنشاء محامٍ عبر Admin API مع تأكيد البريد داخل الخادم — بلا رسالة Confirmation
 * حتى لا يشارك حصة بريد Auth مع رمز مقر القيادة.
 * إن غاب مفتاح الخدمة نرجع لمسار signup العام.
 */
export async function provisionLawyerGoTrueAccount(args: {
    url: string;
    anonKey: string;
    email: string;
    password: string;
    meta: Record<string, unknown>;
}): Promise<LawyerGoTrueProvision> {
    const serviceKey = readSupabasePrivilegedKey();
    try {
        if (serviceKey) {
            return await provisionViaAdmin(
                args.url,
                serviceKey,
                args.anonKey,
                args.email,
                args.password,
                args.meta,
            );
        }
        return await provisionViaPublicSignup(
            args.url,
            args.anonKey,
            args.email,
            args.password,
            args.meta,
        );
    } catch {
        return {
            ok: false,
            status: 503,
            code: 'AUTH_UNAVAILABLE',
            error: 'Auth service unavailable',
        };
    }
}
