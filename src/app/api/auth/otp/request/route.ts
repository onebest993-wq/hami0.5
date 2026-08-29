import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { getSupabaseAuthConfigFromEnv } from '../../../security/sessionCookie.ts';
import { resolvePasswordResetRedirectTo } from '../../passwordResetRedirectAllowlist.ts';
import {
    deliverAuthOtp,
    isAuthOtpEmailChannelReady,
    isAuthOtpWhatsAppChannelReady,
} from '../authOtpChannels.ts';
import { emailDomainAcceptsMail } from '../authOtpEmailMx.ts';
import { authOtpJson, readAuthOtpClientIp } from '../authOtpHttp.ts';
import { lookupAuthOtpAccountByEmail } from '../authOtpLookup.ts';
import { createAuthOtpChallenge } from '../authOtpStore.ts';
import {
    AUTH_OTP_ACCOUNT_MISSING_AR,
    AUTH_OTP_MAILBOX_UNREAL_AR,
    AUTH_OTP_NO_PHONE_AR,
    AUTH_OTP_RESEND_SEC,
    AUTH_OTP_WHATSAPP_UNCONFIGURED_AR,
    authOtpDeliverErrorAr,
    authOtpSentMessage,
    isAuthOtpChannel,
    isAuthOtpPurpose,
} from '../authOtpTypes.ts';
import { isResendTestSenderRestriction } from '../../../security/adminMailer.ts';
import { phoneLastTwoDigits } from '../whatsappMsisdn.ts';
import {
    normalizeRegistrationEmail,
    validateRecoveryEmailShape,
} from '../../../../services/auth/registrationCredentialsSecurity.ts';

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 4;

export const runtime = 'nodejs';

async function sendGoTrueRecover(email: string, redirectTo: string, request: Request): Promise<void> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return;
    const safeRedirect = resolvePasswordResetRedirectTo(redirectTo, request);
    try {
        const payload: Record<string, unknown> = { email };
        if (safeRedirect) payload.redirect_to = safeRedirect;
        await fetch(`${cfg.url}/auth/v1/recover`, {
            method: 'POST',
            headers: {
                apikey: cfg.key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch {
        /* generic */
    }
}

/**
 * POST /api/auth/otp/request — رمز تحقق بعد التأكد أن البريد مسجّل.
 * واتساب غير المضبوط يُرفض كإعداد خادم. غياب الحساب يُعلن صراحة بطلب المستخدم.
 */
export async function POST(request: Request): Promise<Response> {
    const ip = readAuthOtpClientIp(request);
    if (
        !(await consumeRateLimitSlot(ip, {
            scope: 'auth-otp-request-ip',
            maxRequests: MAX_PER_IP,
            windowMs: WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
    }

    let email = '';
    let channelRaw: unknown = '';
    let purposeRaw: unknown = '';
    let redirectTo = '';
    try {
        const body = (await request.json()) as {
            email?: unknown;
            channel?: unknown;
            purpose?: unknown;
            redirectTo?: unknown;
        };
        email = typeof body.email === 'string' ? normalizeRegistrationEmail(body.email) : '';
        channelRaw = body.channel;
        purposeRaw = body.purpose;
        redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo.trim() : '';
    } catch {
        return authOtpJson(400, { ok: false, error: 'Invalid JSON body' });
    }

    const shape = validateRecoveryEmailShape(email);
    if (shape) return authOtpJson(400, { ok: false, error: shape });
    if (!isAuthOtpChannel(channelRaw) || !isAuthOtpPurpose(purposeRaw)) {
        return authOtpJson(400, { ok: false, error: 'قناة أو غرض غير صالح' });
    }

    if (!(await emailDomainAcceptsMail(email))) {
        return authOtpJson(400, { ok: false, error: AUTH_OTP_MAILBOX_UNREAL_AR });
    }

    const emailAllowed = await consumeRateLimitSlot(email, {
        scope: `auth-otp-request-${purposeRaw}`,
        maxRequests: MAX_PER_EMAIL,
        windowMs: WINDOW_MS,
        fallbackToMemory: true,
    });
    if (!emailAllowed) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
    }

    const account = await lookupAuthOtpAccountByEmail(email);
    if (!account) {
        return authOtpJson(404, { ok: false, error: AUTH_OTP_ACCOUNT_MISSING_AR });
    }

    const phoneTail = phoneLastTwoDigits(account.phone);

    if (channelRaw === 'whatsapp' && !isAuthOtpWhatsAppChannelReady()) {
        return authOtpJson(503, { ok: false, error: AUTH_OTP_WHATSAPP_UNCONFIGURED_AR });
    }
    if (channelRaw === 'whatsapp' && !phoneTail) {
        return authOtpJson(400, { ok: false, error: AUTH_OTP_NO_PHONE_AR });
    }

    if (channelRaw === 'email' && !isAuthOtpEmailChannelReady()) {
        if (purposeRaw === 'password_reset') {
            await sendGoTrueRecover(account.email, redirectTo, request);
            return authOtpJson(200, {
                ok: true,
                delivery: 'link',
                resendAfterSec: AUTH_OTP_RESEND_SEC,
                phoneTail,
                message: 'أُرسل رابط استعادة كلمة المرور إلى بريدك.',
            });
        }
        return authOtpJson(503, {
            ok: false,
            error: 'إرسال رمز البريد غير مضبوط على الخادم. استخدم رابط التأكيد أو تواصل مع الإدارة.',
        });
    }

    const created = await createAuthOtpChallenge({
        userId: account.userId,
        purpose: purposeRaw,
        channel: channelRaw,
        requestIp: ip === 'unknown' ? null : ip,
    });
    if ('error' in created) {
        return authOtpJson(503, { ok: false, error: created.error });
    }
    const delivered = await deliverAuthOtp({
        channel: channelRaw,
        email: account.email,
        phone: account.phone,
        code: created.code,
        purpose: purposeRaw,
    });
    if (!delivered.ok) {
        if (
            channelRaw === 'email' &&
            purposeRaw === 'password_reset' &&
            isResendTestSenderRestriction(delivered.error)
        ) {
            await sendGoTrueRecover(account.email, redirectTo, request);
            return authOtpJson(200, {
                ok: true,
                delivery: 'link',
                resendAfterSec: AUTH_OTP_RESEND_SEC,
                phoneTail,
                message:
                    'تعذّر إرسال الرمز القصير من المرسل التجريبي إلى هذا البريد (وليس لأن الاستعادة لحساب المدير فقط). أُرسل رابط استعادة إلى صندوقك. افتحه وعيّن كلمة المرور الجديدة.',
            });
        }
        return authOtpJson(503, {
            ok: false,
            error: authOtpDeliverErrorAr(delivered.error),
        });
    }

    return authOtpJson(200, {
        ok: true,
        delivery: 'otp',
        resendAfterSec: AUTH_OTP_RESEND_SEC,
        phoneTail,
        message: authOtpSentMessage(channelRaw, phoneTail),
    });
}
