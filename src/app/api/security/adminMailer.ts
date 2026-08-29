/**
 * Server mailer for Admin HQ OTP — 6-digit mailbox form only.
 * Paths: Resend, SMTP (Proton-compatible), HTTPS webhook.
 * No GoTrue / Magic Link. The code is never logged.
 */

import { readHqMailerEnv } from './adminMailerEnv.ts';
import { isHqSmtpConfigured, isHqSmtpMissingPass, sendHqSmtpMail } from './adminMailerSmtp.ts';
import { isResendTestFromAddress } from './adminMailerFrom.ts';

export type AdminMailPayload = {
    to: string;
    subject: string;
    text: string;
    html?: string;
};

export type AdminMailMode = 'resend' | 'smtp' | 'webhook';

export const HQ_OTP_MAIL_UNCONFIGURED_AR =
    'تعذّر إرسال رمز المقر إلى البريد الرسمي. اضبط RESEND_API_KEY و EMAIL_FROM، أو SMTP: EMAIL_SMTP_HOST و EMAIL_SMTP_USER و EMAIL_SMTP_PASS.';

export const HQ_OTP_SMTP_PASS_MISSING_AR =
    'SMTP مضبوط بدون رمز الإرسال. أضف EMAIL_SMTP_PASS في .env (رمز SMTP من Proton: الإعدادات → IMAP/SMTP — ليس كلمة مرور الحساب) ثم اضغط أرسل الرمز مرة أخرى.';

function getEnv(name: string): string {
    return readHqMailerEnv(name);
}

export const RESEND_TEST_SENDER_AR =
    'مرسل البريد التجريبي لا يوصل الرمز إلا إلى صندوق إعداد الخدمة. هذا ليس قصراً على حساب المدير في حامي. لاستعادة أي بريد محامٍ أضف SMTP من Proton أو وثّق نطاقاً في Resend.';

export function isResendTestSenderRestriction(error: string): boolean {
    return /testing emails|own email address|مرسل البريد التجريبي|مالك حساب Resend|صندوق إعداد الخدمة/i.test(
        error,
    );
}

export function isResendTestFrom(): boolean {
    return isResendTestFromAddress(getEnv('EMAIL_FROM'));
}

export function hqMailerBlockReason(): string {
    if (isAdminMailerConfigured()) return '';
    if (isHqSmtpMissingPass()) return HQ_OTP_SMTP_PASS_MISSING_AR;
    return HQ_OTP_MAIL_UNCONFIGURED_AR;
}

export function resolveAdminMasterEmail(): string {
    return (
        getEnv('EMAIL_HQ_DELIVER_TO') ||
        getEnv('ADMIN_MASTER_EMAIL') ||
        getEnv('VITE_ADMIN_MASTER_EMAIL') ||
        'hami.apps@proton.me'
    );
}

export function maskAdminMailbox(email: string): string {
    const trimmed = email.trim();
    return trimmed.replace(/(.{2}).+(@.+)/, '$1***$2');
}

function isResendConfigured(): boolean {
    return Boolean(getEnv('RESEND_API_KEY') && getEnv('EMAIL_FROM'));
}

function webhookUrl(): string {
    const url = getEnv('EMAIL_WEBHOOK_URL');
    if (!/^https:\/\//i.test(url)) return '';
    return url;
}

export type HqMailerChannel = 'resend' | 'smtp' | 'webhook' | 'none';

export function isAdminMailerConfigured(): boolean {
    return isResendConfigured() || isHqSmtpConfigured() || Boolean(webhookUrl());
}

export function hqMailerChannel(): HqMailerChannel {
    if (isResendConfigured() && !isResendTestFrom()) return 'resend';
    if (isHqSmtpConfigured()) return 'smtp';
    if (isResendConfigured()) return 'resend';
    if (webhookUrl()) return 'webhook';
    return 'none';
}

function resendFailureHint(raw: string): string {
    try {
        const parsed = JSON.parse(raw) as { message?: unknown };
        const message = typeof parsed.message === 'string' ? parsed.message.trim().slice(0, 180) : '';
        if (/testing emails|own email address/i.test(message)) {
            return RESEND_TEST_SENDER_AR;
        }
        if (message && !/re_[A-Za-z0-9_]+/.test(message)) {
            return `فشل إرسال الرمز عبر Resend: ${message}`;
        }
    } catch {
        /* ignore non-JSON bodies */
    }
    return 'فشل إرسال الرمز عبر Resend. تحقق من المفتاح وعنوان المرسل.';
}

async function sendViaResend(
    payload: AdminMailPayload,
): Promise<{ ok: true; mode: 'resend' } | { ok: false; error: string }> {
    const apiKey = getEnv('RESEND_API_KEY');
    const from = getEnv('EMAIL_FROM');
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from,
                to: [payload.to],
                subject: payload.subject,
                text: payload.text,
                html: payload.html ?? `<pre>${payload.text}</pre>`,
            }),
        });
        if (!res.ok) {
            return { ok: false, error: resendFailureHint(await res.text()) };
        }
        return { ok: true, mode: 'resend' };
    } catch {
        return { ok: false, error: 'تعذّر الاتصال بخدمة Resend.' };
    }
}

async function sendViaSmtp(
    payload: AdminMailPayload,
): Promise<{ ok: true; mode: 'smtp' } | { ok: false; error: string }> {
    try {
        await sendHqSmtpMail(payload);
        return { ok: true, mode: 'smtp' };
    } catch {
        return { ok: false, error: 'فشل إرسال الرمز عبر SMTP. تحقق من المضيف ومن رمز التطبيق.' };
    }
}

async function sendViaWebhook(
    payload: AdminMailPayload,
): Promise<{ ok: true; mode: 'webhook' } | { ok: false; error: string }> {
    const url = webhookUrl();
    const token = getEnv('EMAIL_WEBHOOK_TOKEN');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                to: payload.to,
                subject: payload.subject,
                text: payload.text,
                html: payload.html ?? `<pre>${payload.text}</pre>`,
            }),
        });
        if (!res.ok) {
            return { ok: false, error: 'فشل إرسال الرمز عبر بوابة البريد.' };
        }
        return { ok: true, mode: 'webhook' };
    } catch {
        return { ok: false, error: 'تعذّر الاتصال ببوابة البريد.' };
    }
}

export async function sendAdminMail(
    payload: AdminMailPayload,
): Promise<{ ok: true; mode: AdminMailMode } | { ok: false; error: string }> {
    const preferSmtpOverTestResend = isHqSmtpConfigured() && isResendTestFrom();
    if (preferSmtpOverTestResend) return sendViaSmtp(payload);

    if (isResendConfigured() && !isResendTestFrom()) return sendViaResend(payload);

    if (isResendConfigured()) {
        const resend = await sendViaResend(payload);
        if (resend.ok) return resend;
        if (isResendTestSenderRestriction(resend.error) && isHqSmtpConfigured()) {
            return sendViaSmtp(payload);
        }
        if (isResendTestSenderRestriction(resend.error) && webhookUrl()) {
            return sendViaWebhook(payload);
        }
        return resend;
    }
    if (isHqSmtpConfigured()) return sendViaSmtp(payload);
    if (webhookUrl()) return sendViaWebhook(payload);
    return { ok: false, error: hqMailerBlockReason() };
}
