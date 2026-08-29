import {
    isAdminMailerConfigured,
    sendAdminMail,
} from '../../security/adminMailer.ts';
import { readHqMailerEnv } from '../../security/adminMailerEnv.ts';
import { toIraqWhatsAppMsisdn } from './whatsappMsisdn.ts';
import {
    buildWhatsAppOtpTemplatePayload,
    type WhatsAppOtpTemplateKind,
} from './whatsappOtpTemplate.ts';
import type { AuthOtpChannel, AuthOtpPurpose } from './authOtpTypes.ts';

function purposeLabel(purpose: AuthOtpPurpose): string {
    return purpose === 'password_reset' ? 'استعادة كلمة المرور' : 'تأكيد البريد الإلكتروني';
}

function isHttpsUrl(value: string): boolean {
    return /^https:\/\//i.test(value);
}

export function isAuthOtpEmailChannelReady(): boolean {
    return isAdminMailerConfigured();
}

export function isMetaWhatsAppCloudReady(): boolean {
    const token = readHqMailerEnv('WHATSAPP_TOKEN');
    const phoneId = readHqMailerEnv('WHATSAPP_PHONE_NUMBER_ID');
    const template = readHqMailerEnv('WHATSAPP_OTP_TEMPLATE');
    return Boolean(token && phoneId && template);
}

/** وسيط واتساب مخصّص، أو EMAIL_WEBHOOK فقط إذا صُرّح WHATSAPP_VIA_EMAIL_WEBHOOK=true */
export function isAuthOtpWhatsAppWebhookReady(): boolean {
    if (isHttpsUrl(readHqMailerEnv('WHATSAPP_WEBHOOK_URL'))) return true;
    const viaEmail = readHqMailerEnv('WHATSAPP_VIA_EMAIL_WEBHOOK').toLowerCase() === 'true';
    return viaEmail && isHttpsUrl(readHqMailerEnv('EMAIL_WEBHOOK_URL'));
}

export function isAuthOtpWhatsAppChannelReady(): boolean {
    return isMetaWhatsAppCloudReady() || isAuthOtpWhatsAppWebhookReady();
}

export async function sendAuthOtpEmail(input: {
    to: string;
    code: string;
    purpose: AuthOtpPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const label = purposeLabel(input.purpose);
    const mail = await sendAdminMail({
        to: input.to,
        subject: `رمز التحقق — حامي (${label})`,
        text: `رمز التحقق لتطبيق حامي (${label}): ${input.code}\nصالح لمدة 10 دقائق.\nإن لم تطلبه فتجاهل الرسالة.`,
        html: `<p>رمز التحقق لتطبيق حامي (${label}):</p><p style="font-size:24px;letter-spacing:4px;"><strong>${input.code}</strong></p><p>صالح لمدة 10 دقائق. إن لم تطلبه فتجاهل الرسالة.</p>`,
    });
    if (!mail.ok) return { ok: false, error: mail.error };
    return { ok: true };
}

function whatsappGraphVersion(): string {
    const raw = readHqMailerEnv('WHATSAPP_GRAPH_VERSION') || 'v21.0';
    return /^v\d+(\.\d+)?$/.test(raw) ? raw : 'v21.0';
}

async function sendWhatsAppCloudTemplate(toMsisdn: string, code: string): Promise<boolean> {
    const token = readHqMailerEnv('WHATSAPP_TOKEN');
    const phoneId = readHqMailerEnv('WHATSAPP_PHONE_NUMBER_ID');
    const template = readHqMailerEnv('WHATSAPP_OTP_TEMPLATE');
    const lang = readHqMailerEnv('WHATSAPP_OTP_TEMPLATE_LANG') || 'ar';
    if (!token || !phoneId || !template) return false;
    const kinds: WhatsAppOtpTemplateKind[] = ['authentication', 'body_only'];
    for (const kind of kinds) {
        try {
            const res = await fetch(
                `https://graph.facebook.com/${whatsappGraphVersion()}/${phoneId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(
                        buildWhatsAppOtpTemplatePayload({
                            toMsisdn,
                            code,
                            template,
                            lang,
                            kind,
                        }),
                    ),
                },
            );
            if (res.ok) return true;
        } catch {
            /* جرّب الشكل التالي */
        }
    }
    return false;
}

function resolveWhatsAppWebhookTarget(): { url: string; token: string } | null {
    const dedicated = readHqMailerEnv('WHATSAPP_WEBHOOK_URL');
    if (isHttpsUrl(dedicated)) {
        return {
            url: dedicated,
            token: readHqMailerEnv('WHATSAPP_WEBHOOK_TOKEN') || readHqMailerEnv('EMAIL_WEBHOOK_TOKEN'),
        };
    }
    const viaEmail = readHqMailerEnv('WHATSAPP_VIA_EMAIL_WEBHOOK').toLowerCase() === 'true';
    const emailUrl = readHqMailerEnv('EMAIL_WEBHOOK_URL');
    if (viaEmail && isHttpsUrl(emailUrl)) {
        return { url: emailUrl, token: readHqMailerEnv('EMAIL_WEBHOOK_TOKEN') };
    }
    return null;
}

async function sendWhatsAppWebhook(
    toMsisdn: string,
    code: string,
    purpose: AuthOtpPurpose,
): Promise<boolean> {
    const target = resolveWhatsAppWebhookTarget();
    if (!target) return false;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (target.token) headers.Authorization = `Bearer ${target.token}`;
    try {
        const res = await fetch(target.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                channel: 'whatsapp',
                to: toMsisdn,
                text: `رمز حامي: ${code} — صالح 10 دقائق.`,
                purpose,
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

export async function sendAuthOtpWhatsApp(input: {
    phone: string;
    code: string;
    purpose: AuthOtpPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    const msisdn = toIraqWhatsAppMsisdn(input.phone);
    if (!msisdn) return { ok: false, error: 'invalid_phone' };
    if (await sendWhatsAppCloudTemplate(msisdn, input.code)) return { ok: true };
    if (await sendWhatsAppWebhook(msisdn, input.code, input.purpose)) return { ok: true };
    return { ok: false, error: 'whatsapp_send_failed' };
}

export async function deliverAuthOtp(input: {
    channel: AuthOtpChannel;
    email: string;
    phone: string | null;
    code: string;
    purpose: AuthOtpPurpose;
}): Promise<{ ok: true } | { ok: false; error: string }> {
    if (input.channel === 'email') {
        return sendAuthOtpEmail({ to: input.email, code: input.code, purpose: input.purpose });
    }
    if (!input.phone) return { ok: false, error: 'no_phone' };
    return sendAuthOtpWhatsApp({ phone: input.phone, code: input.code, purpose: input.purpose });
}
