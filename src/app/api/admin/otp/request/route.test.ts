import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    requireHeadquartersCookieAuthMock,
    consumeRateMock,
    createOtpMock,
    burnOpenOtpMock,
    sendAdminMailMock,
    isAdminMailerConfiguredMock,
    hqMailerBlockReasonMock,
} = vi.hoisted(() => ({
    requireHeadquartersCookieAuthMock: vi.fn(),
    consumeRateMock: vi.fn(),
    createOtpMock: vi.fn(),
    burnOpenOtpMock: vi.fn(),
    sendAdminMailMock: vi.fn(),
    isAdminMailerConfiguredMock: vi.fn(),
    hqMailerBlockReasonMock: vi.fn(),
}));

vi.mock('../../../security/requireHeadquartersCookieAuth.ts', () => ({
    requireHeadquartersCookieAuth: (...a: unknown[]) => requireHeadquartersCookieAuthMock(...a),
}));

vi.mock('../../../security/wifeRateLimitStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../security/wifeRateLimitStore.ts')>();
    return {
        ...actual,
        consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
    };
});

vi.mock('../../../security/adminOtpStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../security/adminOtpStore.ts')>();
    return {
        ...actual,
        createAdminOtpChallenge: (...a: unknown[]) => createOtpMock(...a),
        burnOpenAdminOtpChallenges: (...a: unknown[]) => burnOpenOtpMock(...a),
    };
});

vi.mock('../../../security/adminMailer.ts', () => ({
    resolveAdminMasterEmail: () => 'hami.apps@proton.me',
    maskAdminMailbox: (email: string) => email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    isAdminMailerConfigured: (...a: unknown[]) => isAdminMailerConfiguredMock(...a),
    hqMailerBlockReason: (...a: unknown[]) => hqMailerBlockReasonMock(...a),
    sendAdminMail: (...a: unknown[]) => sendAdminMailMock(...a),
    HQ_OTP_MAIL_UNCONFIGURED_AR:
        'تعذّر إرسال رمز المقر إلى البريد الرسمي. اضبط RESEND_API_KEY و EMAIL_FROM، أو SMTP: EMAIL_SMTP_HOST و EMAIL_SMTP_USER و EMAIL_SMTP_PASS.',
}));

import { POST } from './route.ts';

const DEVICE = 'hqotpdevice01';

function req(): Request {
    return new Request('https://app.test/api/admin/otp/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Origin: 'https://app.test',
            'x-wife-device-id': DEVICE,
        },
        body: JSON.stringify({ deviceFingerprint: DEVICE }),
    });
}

describe('POST /api/admin/otp/request mailbox shift', () => {
    beforeEach(() => {
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
        });
        consumeRateMock.mockResolvedValue(true);
        isAdminMailerConfiguredMock.mockReturnValue(true);
        hqMailerBlockReasonMock.mockReturnValue(
            'تعذّر إرسال رمز المقر إلى البريد الرسمي. اضبط RESEND_API_KEY و EMAIL_FROM، أو SMTP: EMAIL_SMTP_HOST و EMAIL_SMTP_USER و EMAIL_SMTP_PASS.',
        );
        createOtpMock.mockResolvedValue({ code: '234569', expiresAt: '2099-01-01T00:00:00.000Z' });
        sendAdminMailMock.mockResolvedValue({ ok: true, mode: 'resend' });
        burnOpenOtpMock.mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('يرسل أرقام الرسالة المزاحَة لا رمز الحقل', async () => {
        const res = await POST(req());
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            delivered: true,
            mailMode: 'resend',
        });
        expect(JSON.stringify(body)).not.toContain('234569');
        expect(JSON.stringify(body)).not.toContain('123459');
        expect(sendAdminMailMock).toHaveBeenCalledTimes(1);
        const mail = sendAdminMailMock.mock.calls[0]?.[0] as { text: string; html: string };
        expect(mail.text).toContain('123459');
        expect(mail.html).toContain('123459');
        expect(mail.text).not.toContain('234569');
        expect(mail.html).not.toContain('234569');
    });

    it('يعيد mailMode=webhook عندما يرسل المُرسِل عبر HTTPS webhook', async () => {
        sendAdminMailMock.mockResolvedValue({ ok: true, mode: 'webhook' });
        const res = await POST(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            delivered: true,
            mailMode: 'webhook',
        });
    });

    it('يعيد mailMode=smtp لمسار Proton', async () => {
        sendAdminMailMock.mockResolvedValue({ ok: true, mode: 'smtp' });
        const res = await POST(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            delivered: true,
            mailMode: 'smtp',
        });
    });

    it('يرفض الإرسال بلا مُرسِل مضبوط ولا ينشئ تحدياً', async () => {
        isAdminMailerConfiguredMock.mockReturnValue(false);
        const res = await POST(req());
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toMatch(/SMTP|RESEND/);
        expect(createOtpMock).not.toHaveBeenCalled();
        expect(sendAdminMailMock).not.toHaveBeenCalled();
    });

    it('يرفض الإرسال بنص نقص رمز SMTP عندما يُرجع المُرسِل ذلك', async () => {
        isAdminMailerConfiguredMock.mockReturnValue(false);
        hqMailerBlockReasonMock.mockReturnValue(
            'SMTP مضبوط بدون رمز الإرسال. أضف EMAIL_SMTP_PASS في .env',
        );
        const res = await POST(req());
        expect(res.status).toBe(503);
        const body = await res.json();
        expect(body.error).toMatch(/EMAIL_SMTP_PASS/);
        expect(createOtpMock).not.toHaveBeenCalled();
    });
});
