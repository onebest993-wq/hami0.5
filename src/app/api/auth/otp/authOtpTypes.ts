export const AUTH_OTP_PURPOSES = ['password_reset', 'email_confirm'] as const;
export type AuthOtpPurpose = (typeof AUTH_OTP_PURPOSES)[number];

export const AUTH_OTP_CHANNELS = ['email', 'whatsapp'] as const;
export type AuthOtpChannel = (typeof AUTH_OTP_CHANNELS)[number];

export const AUTH_OTP_TTL_MS = 10 * 60 * 1000;
export const AUTH_OTP_RESEND_SEC = 60;
export const AUTH_OTP_MAX_ATTEMPTS = 5;
export const AUTH_OTP_CODE_LEN = 6;

export function isAuthOtpPurpose(value: unknown): value is AuthOtpPurpose {
    return typeof value === 'string' && (AUTH_OTP_PURPOSES as readonly string[]).includes(value);
}

export function isAuthOtpChannel(value: unknown): value is AuthOtpChannel {
    return typeof value === 'string' && (AUTH_OTP_CHANNELS as readonly string[]).includes(value);
}

export const AUTH_OTP_ACCOUNT_MISSING_AR = 'لا يوجد حساب مسجّل بهذا البريد';

export const AUTH_OTP_MAILBOX_UNREAL_AR =
    'هذا البريد لا يبدو عنواناً حقيقياً يمكنه استقبال الرسائل. تحقق من الكتابة.';

export const AUTH_OTP_NO_PHONE_AR =
    'لا يوجد رقم واتساب مسجّل على هذا الحساب. استخدم البريد أو تواصل مع الإدارة.';

export const AUTH_OTP_INVALID_PHONE_AR = 'رقم الواتساب على الحساب غير صالح للإرسال.';

export const AUTH_OTP_WHATSAPP_SEND_FAILED_AR =
    'تعذّر إرسال رسالة واتساب. استخدم البريد أو تواصل مع الإدارة.';

export const AUTH_OTP_INVALID_AR = 'الرمز غير صحيح أو منتهٍ. اطلب رمزاً جديداً إن لزم.';

export const AUTH_OTP_WHATSAPP_UNCONFIGURED_AR =
    'إرسال واتساب غير متاح على الخادم حالياً. استخدم البريد أو تواصل مع الإدارة عبر واتساب.';

export function authOtpSentMessage(channel: AuthOtpChannel, phoneTail: string | null): string {
    if (channel === 'whatsapp' && phoneTail) {
        return `أُرسل رمز التحقق إلى الرقم الذي ينتهي بـ ${phoneTail}. صالح لعشر دقائق.`;
    }
    if (channel === 'whatsapp') {
        return 'أُرسل رمز التحقق إلى واتساب المسجّل على الحساب. صالح لعشر دقائق.';
    }
    return 'أُرسل رمز التحقق إلى بريدك الإلكتروني. صالح لعشر دقائق.';
}

export function authOtpDeliverErrorAr(code: string): string {
    if (code === 'no_phone') return AUTH_OTP_NO_PHONE_AR;
    if (code === 'invalid_phone') return AUTH_OTP_INVALID_PHONE_AR;
    if (code === 'whatsapp_send_failed') return AUTH_OTP_WHATSAPP_SEND_FAILED_AR;
    return code;
}
