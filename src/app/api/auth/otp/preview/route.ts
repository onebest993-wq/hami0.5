import { consumeRateLimitSlot } from '../../../security/wifeRateLimitStore.ts';
import { readHqMailerEnv } from '../../../security/adminMailerEnv.ts';
import { isAuthOtpEmailChannelReady, isAuthOtpWhatsAppChannelReady } from '../authOtpChannels.ts';
import { emailDomainAcceptsMail } from '../authOtpEmailMx.ts';
import { authOtpJson, readAuthOtpClientIp } from '../authOtpHttp.ts';
import { lookupAuthOtpAccountByEmail } from '../authOtpLookup.ts';
import {
    AUTH_OTP_ACCOUNT_MISSING_AR,
    AUTH_OTP_MAILBOX_UNREAL_AR,
    isAuthOtpPurpose,
} from '../authOtpTypes.ts';
import { phoneLastTwoDigits } from '../whatsappMsisdn.ts';
import { buildHamiSupportWhatsAppUrlFromRaw } from '../../../../constants/supportWhatsapp.ts';
import {
    normalizeRegistrationEmail,
    validateRecoveryEmailShape,
} from '../../../../services/auth/registrationCredentialsSecurity.ts';

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IP = 20;
const MAX_PER_EMAIL = 8;

export const runtime = 'nodejs';

function supportWhatsAppUrl(): string | null {
    const raw = readHqMailerEnv('HAMI_SUPPORT_WHATSAPP') || readHqMailerEnv('VITE_SUPPORT_WHATSAPP');
    return buildHamiSupportWhatsAppUrlFromRaw(raw);
}

/**
 * POST /api/auth/otp/preview — هل البريد حقيقي ومسجّل؟ جاهزية القنوات فقط.
 * ذيل الرقم لا يُعاد هنا: المسار مفتوح بلا جلسة، فإعادته تكشف بيانات مالك الحساب
 * لمن يعرف بريده فقط. الذيل يصل من `/otp/request` بعد إرسال رمز فعلي لصاحب الحساب.
 *
 * 404 للحساب الغائب مقصود للمنتج (لوحة الاستعادة تقول صراحة إن غير المسجّل
 * لن يُتابَع). هذا أوراكل تعداد مقيّد بحدّ الطلبات لكل IP وبريد — لا نوحّده
 * مع complete لأن إخفاء الغياب يغيّر مسار المحامي الظاهر.
 */
export async function POST(request: Request): Promise<Response> {
    const ip = readAuthOtpClientIp(request);
    if (
        !(await consumeRateLimitSlot(ip, {
            scope: 'auth-otp-preview-ip',
            maxRequests: MAX_PER_IP,
            windowMs: WINDOW_MS,
            fallbackToMemory: true,
        }))
    ) {
        return authOtpJson(429, { ok: false, error: 'تجاوزت حد الطلبات — حاول لاحقاً' });
    }

    let email = '';
    let purposeRaw: unknown = '';
    try {
        const body = (await request.json()) as { email?: unknown; purpose?: unknown };
        email = typeof body.email === 'string' ? normalizeRegistrationEmail(body.email) : '';
        purposeRaw = body.purpose;
    } catch {
        return authOtpJson(400, { ok: false, error: 'Invalid JSON body' });
    }

    const shape = validateRecoveryEmailShape(email);
    if (shape) return authOtpJson(400, { ok: false, error: shape });
    if (!isAuthOtpPurpose(purposeRaw)) {
        return authOtpJson(400, { ok: false, error: 'غرض غير صالح' });
    }

    if (!(await emailDomainAcceptsMail(email))) {
        return authOtpJson(400, { ok: false, error: AUTH_OTP_MAILBOX_UNREAL_AR });
    }

    const emailAllowed = await consumeRateLimitSlot(email, {
        scope: `auth-otp-preview-${purposeRaw}`,
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

    return authOtpJson(200, {
        ok: true,
        hasWhatsAppNumber: Boolean(phoneLastTwoDigits(account.phone)),
        emailReady: isAuthOtpEmailChannelReady(),
        whatsappSendReady: isAuthOtpWhatsAppChannelReady(),
        adminWhatsappUrl: supportWhatsAppUrl(),
    });
}
