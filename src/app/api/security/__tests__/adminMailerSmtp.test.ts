import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildHqSmtpMime,
    extractSmtpMailbox,
    isHqSmtpConfigured,
    isHqSmtpMissingPass,
    readHqSmtpConfig,
} from '../adminMailerSmtp.ts';

describe('adminMailerSmtp', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('reads Proton-style SMTP config and envelope mailbox', () => {
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_PORT', '587');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'smtp-token');
        vi.stubEnv('EMAIL_FROM', 'Hami <hami.apps@proton.me>');
        vi.stubEnv('EMAIL_SMTP_SECURE', '');
        expect(isHqSmtpConfigured()).toBe(true);
        expect(readHqSmtpConfig()).toMatchObject({
            host: 'smtp.protonmail.ch',
            port: 587,
            secure: false,
            user: 'hami.apps@proton.me',
        });
        expect(extractSmtpMailbox('Hami <hami.apps@proton.me>')).toBe('hami.apps@proton.me');
    });

    it('لا يستخدم onboarding@resend.dev كمرسل SMTP', () => {
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'smtp-token');
        vi.stubEnv('EMAIL_FROM', 'Hami <onboarding@resend.dev>');
        expect(readHqSmtpConfig()?.from).toMatch(/hami\.apps@proton\.me/);
    });

    it('rejects incomplete SMTP and non-https-looking hosts', () => {
        vi.stubEnv('EMAIL_SMTP_HOST', '');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', 'x');
        vi.stubEnv('ADMIN_MASTER_EMAIL', 'hami.apps@proton.me');
        expect(isHqSmtpConfigured()).toBe(false);

        vi.stubEnv('EMAIL_SMTP_HOST', 'not a host');
        expect(isHqSmtpConfigured()).toBe(false);
    });

    it('detects Proton SMTP host without a token', () => {
        vi.stubEnv('EMAIL_SMTP_HOST', 'smtp.protonmail.ch');
        vi.stubEnv('EMAIL_SMTP_USER', 'hami.apps@proton.me');
        vi.stubEnv('EMAIL_SMTP_PASS', '');
        vi.stubEnv('EMAIL_FROM', 'Hami <hami.apps@proton.me>');
        expect(isHqSmtpConfigured()).toBe(false);
        expect(isHqSmtpMissingPass()).toBe(true);
    });

    it('builds a UTF-8 MIME body without the confirm code when only mailbox digits are passed', () => {
        const mime = buildHqSmtpMime({
            from: 'Hami <hami.apps@proton.me>',
            to: 'hami.apps@proton.me',
            subject: 'رمز دخول مقر قيادة حامي',
            text: 'رمز التحقق لمقر القيادة: 123459',
            html: '<p>123459</p>',
        });
        expect(mime).toContain('From: Hami <hami.apps@proton.me>');
        expect(mime).toContain('Subject: =?UTF-8?B?');
        expect(mime).toContain('multipart/alternative');
        expect(Buffer.from('رمز التحقق لمقر القيادة: 123459', 'utf8').toString('base64')).toBeTruthy();
        expect(mime).toContain(Buffer.from('رمز التحقق لمقر القيادة: 123459', 'utf8').toString('base64').slice(0, 24));
        expect(mime).not.toContain('234569');
    });
});
