import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '../../../security/supabaseAdminClient.ts';
import { validateHeadquartersAccountPassword } from '../../../../services/admin/hqAccountPassword.ts';
import { authOtpJson, readAuthOtpClientIp } from '../authOtpHttp.ts';
import { lookupAuthOtpAccountByEmail } from '../authOtpLookup.ts';
import { confirmGoTruePasswordIsLive } from '../authOtpPasswordConfirm.ts';
import { consumeAuthOtpChallenge } from '../authOtpStore.ts';
import { AUTH_OTP_INVALID_AR, isAuthOtpPurpose } from '../authOtpTypes.ts';

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 10;

export const runtime = 'nodejs';

function genericInvalid(): Response {
    return authOtpJson(400, { ok: false, error: AUTH_OTP_INVALID_AR });
}

/**
 * POST /api/auth/otp/complete
 * password_reset: رمز + كلمة مرور جديدة (Admin API) ثم إلغاء الجلسات.
 * email_confirm: رمز ثم تأكيد البريد عبر Admin API.
 */
export async function POST(request: Request): Promise<Response> {
    const ip = readAuthOtpClientIp(request);
    if (
        !(await consumeRateLimitSlot(ip, {
            scope: 'auth-otp-complete-ip',
            maxRequests: MAX_PER_IP,
            windowMs: WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد المحاولات — حاول لاحقاً' });
    }

    let email = '';
    let code = '';
    let purposeRaw: unknown = '';
    let newPassword = '';
    try {
        const body = (await request.json()) as {
            email?: unknown;
            code?: unknown;
            purpose?: unknown;
            newPassword?: unknown;
        };
        email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
        purposeRaw = body.purpose;
        newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
    } catch {
        return authOtpJson(400, { ok: false, error: 'Invalid JSON body' });
    }

    if (!email.includes('@') || !isAuthOtpPurpose(purposeRaw) || code.length < 4) {
        return genericInvalid();
    }

    const emailAllowed = await consumeRateLimitSlot(email, {
        scope: `auth-otp-complete-${purposeRaw}`,
        maxRequests: MAX_PER_EMAIL,
        windowMs: WINDOW_MS,
        fallbackToMemory: true,
    });
    if (!emailAllowed) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد المحاولات — حاول لاحقاً' });
    }

    if (purposeRaw === 'password_reset') {
        const policy = validateHeadquartersAccountPassword(newPassword);
        if (policy) return authOtpJson(400, { ok: false, error: policy });
    }

    const account = await lookupAuthOtpAccountByEmail(email);
    if (!account) return genericInvalid();

    const consumed = await consumeAuthOtpChallenge({
        userId: account.userId,
        purpose: purposeRaw,
        code,
    });
    if (!consumed.ok) return genericInvalid();

    const admin = getSupabaseAdminClient();
    if (!admin) return authOtpJson(503, { ok: false, error: 'تعذّر إكمال العملية على الخادم' });
    const api = getGoTrueAdminApi(admin);

    if (purposeRaw === 'email_confirm') {
        const { error } = await api.updateUserById(account.userId, { email_confirm: true });
        if (error) return authOtpJson(500, { ok: false, error: 'تعذّر تأكيد البريد' });
        return authOtpJson(200, { ok: true, message: 'تم تأكيد البريد. يمكنك تسجيل الدخول.' });
    }

    const { error } = await api.updateUserById(account.userId, { password: newPassword });
    if (error) return authOtpJson(500, { ok: false, error: 'تعذّر تحديث كلمة المرور' });

    const live = await confirmGoTruePasswordIsLive(account.email, newPassword);
    if (live === 'failed') {
        try {
            await api.signOut?.(account.userId, 'global');
        } catch {
            /* أفضل جهد */
        }
        return authOtpJson(500, {
            ok: false,
            error: 'تعذّر التأكد من أن كلمة المرور الجديدة تعمل. جرّب الدخول بها، أو تواصل مع الإدارة.',
        });
    }

    try {
        await api.signOut?.(account.userId, 'global');
    } catch {
        /* كلمة المرور تغيّرت — إلغاء الجلسات أفضل جهد */
    }
    return authOtpJson(200, {
        ok: true,
        message: 'تم تحديث كلمة المرور وهي الآن كلمة الدخول الأصلية. سجّل الدخول بها.',
        passwordLive: live === 'live' || live === 'skipped',
    });
}
