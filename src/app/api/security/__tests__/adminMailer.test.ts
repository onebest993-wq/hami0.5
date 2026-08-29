import { afterEach, describe, expect, it, vi } from 'vitest';

const { sendHqSmtpMailMock } = vi.hoisted(() => ({
    sendHqSmtpMailMock: vi.fn(),
}));

vi.mock('../adminMailerSmtp.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../adminMailerSmtp.ts')>();
    return {
        ...actual,
        sendHqSmtpMail: (...a: unknown[]) => sendHqSmtpMailMock(...a),
    };
});

import {
    HQ_OTP_SMTP_PASS_MISSING_AR,
    hqMailerBlockReason,
    hqMailerChannel,
    isAdminMailerConfigured,
    maskAdminMailbox,
    sendAdminMail,
} from '../adminMailer.ts';

describe('adminMailer', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        sendHqSmtpMailMock.mockReset();
    });

    it('masks the official headquarters mailbox', () => {
        expect(maskAdminMailbox('hami.apps@proton.me')).toBe('ha***@proton.me');
    });

    it('is unconfigured without Resend, SMTP, or webhook', () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_FROM', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        vi.stubEnv('EMAIL_SMTP_HOST', '');
        vi.stubEnv('EMAIL_SMTP_USER', '');
        vi.stubEnv('EMAIL_SMTP_PASS', '');
        expect(isAdminMailerConfigured()).toBe(false);
        expect(hqMailerChannel()).toBe('none');
    });

    it('fails closed instead of logging the OTP when Resend is missing', async () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_FROM', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        vi.stubEnv('EMAIL_SMTP_HOST', '');
        const result = await sendAdminMail({
            to: 'hami.apps@proton.me',
            subject: 'رمز',
            text: 'رمز التحقق لمقر القيادة: 123456',
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toMatch(/RESEND_API_KEY|SMTP/);
        expect(result.error).not.toContain('123456');
    });

    it('posts to Resend when keys exist', async () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key');
        vi.stubEnv('EMAIL_FROM', 'Hami <noreply@example.com>');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => '',
        });
        vi.stubGlobal('fetch', fetchMock);
        const result = await sendAdminMail({
            to: 'hami.apps@proton.me',
            subject: 'رمز دخول مقر قيادة حامي',
            text: 'code',
        });
        expect(result).toEqual({ ok: true, mode: 'resend' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(String(init.body));
        expect(body.to).toEqual(['hami.apps@proton.me']);
        expect(body.from).toBe('Hami <noreply@example.com>');
    });

    it('surfaces Resend API errors without the OTP or the API key', async () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key');
        vi.stubEnv('EMAIL_FROM', 'Hami <onboarding@resend.dev>');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            text: async () =>
                JSON.stringify({ message: 'You can only send testing emails to your own email address.' }),
        });
        vi.stubGlobal('fetch', fetchMock);
        const result = await sendAdminMail({
            to: 'other@example.com',
            subject: 'رمز',
            text: 'رمز التحقق لمقر القيادة: 123459',
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toMatch(/صندوق إعداد الخدمة|ليس قصراً على حساب المدير/);
        expect(result.error).not.toContain('123459');
        expect(result.error).not.toContain('re_test_key');
    });

    it('sends HQ OTP through an HTTPS webhook when Resend is unset', async () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_FROM', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', 'https://hooks.example.test/hq-otp');
        vi.stubEnv('EMAIL_WEBHOOK_TOKEN', 'webhook-secret-token');
        vi.stubEnv('EMAIL_SMTP_HOST', '');
        expect(isAdminMailerConfigured()).toBe(true);
        expect(hqMailerChannel()).toBe('webhook');
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            text: async () => '',
        });
        vi.stubGlobal('fetch', fetchMock);
        const result = await sendAdminMail({
            to: 'hami.apps@proton.me',
            subject: 'رمز دخول مقر قيادة حامي',
            text: 'رمز التحقق لمقر القيادة: 123459',
        });
        expect(result).toEqual({ ok: true, mode: 'webhook' });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe('https://hooks.example.test/hq-otp');
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer webhook-secret-token');
        const body = JSON.parse(String(init.body));
        expect(body.to).toBe('hami.apps@proton.me');
        expect(body.text).toContain('123459');
        expect(body.text).not.toContain('234569');
    });

    it('sends HQ OTP through SMTP when Resend is unset', async () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_FROM', 'Hami <hami.apps@proton.me>');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'smtp-token');
        sendHqSmtpMailMock.mockResolvedValue(undefined);
        expect(isAdminMailerConfigured()).toBe(true);
        expect(hqMailerChannel()).toBe('smtp');
        const result = await sendAdminMail({
            to: 'hami.apps@proton.me',
            subject: 'رمز دخول مقر قيادة حامي',
            text: 'رمز التحقق لمقر القيادة: 123459',
        });
        expect(result).toEqual({ ok: true, mode: 'smtp' });
        expect(sendHqSmtpMailMock).toHaveBeenCalledTimes(1);
        const arg = sendHqSmtpMailMock.mock.calls[0]?.[0] as { text: string };
        expect(arg.text).toContain('123459');
        expect(arg.text).not.toContain('234569');
    });

    it('rejects a non-HTTPS webhook', () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_FROM', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', 'http://hooks.example.test/hq-otp');
        vi.stubEnv('EMAIL_SMTP_HOST', '');
        expect(isAdminMailerConfigured()).toBe(false);
    });

    it('names the missing Proton SMTP token when host and user exist', async () => {
        vi.stubEnv('RESEND_API_KEY', '');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', '');
        vi.stubEnv('EMAIL_FROM', 'Hami <hami.apps@proton.me>');
        expect(isAdminMailerConfigured()).toBe(false);
        expect(hqMailerBlockReason()).toBe(HQ_OTP_SMTP_PASS_MISSING_AR);
        const result = await sendAdminMail({
            to: 'hami.apps@proton.me',
            subject: 'رمز',
            text: 'رمز التحقق لمقر القيادة: 123459',
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.error).toBe(HQ_OTP_SMTP_PASS_MISSING_AR);
        expect(result.error).not.toContain('123459');
    });

    it('يفضّل SMTP على Resend التجريبي حتى يصل الرمز لأي صندوق مسجّل', async () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key');
        vi.stubEnv('EMAIL_FROM', 'Hami <onboarding@resend.dev>');
        vi.stubEnv('EMAIL_WEBHOOK_URL', '');
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'smtp-token');
        sendHqSmtpMailMock.mockResolvedValue(undefined);
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        expect(hqMailerChannel()).toBe('smtp');
        const result = await sendAdminMail({
            to: 'lawyer@gmail.com',
            subject: 'رمز',
            text: 'رمز التحقق: 123459',
        });
        expect(result).toEqual({ ok: true, mode: 'smtp' });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(sendHqSmtpMailMock).toHaveBeenCalledTimes(1);
        const arg = sendHqSmtpMailMock.mock.calls[0]?.[0] as { to: string };
        expect(arg.to).toBe('lawyer@gmail.com');
    });

    it('names Resend as the preferred mail channel when the From domain is not a test sender', () => {
        vi.stubEnv('RESEND_API_KEY', 're_test_key');
        vi.stubEnv('EMAIL_FROM', 'Hami <noreply@example.com>');
        vi.stubEnv('EMAIL_WEBHOOK_URL', 'https://hooks.example.test/hq-otp');
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'smtp-token');
        expect(hqMailerChannel()).toBe('resend');
    });
});
