import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWifeRateLimitStoreForTests } from '../../../security/wifeRateLimitStore.ts';

const lookup = vi.fn();
const mx = vi.fn(async () => true);
const emailReady = vi.fn(() => true);
const waReady = vi.fn(() => true);

vi.mock('../authOtpLookup.ts', () => ({
    lookupAuthOtpAccountByEmail: (...args: unknown[]) => lookup(...args),
}));

vi.mock('../authOtpEmailMx.ts', () => ({
    emailDomainAcceptsMail: (...args: unknown[]) => mx(...args),
}));

vi.mock('../authOtpChannels.ts', () => ({
    isAuthOtpEmailChannelReady: () => emailReady(),
    isAuthOtpWhatsAppChannelReady: () => waReady(),
}));

vi.mock('../../../security/adminMailerEnv.ts', () => ({
    readHqMailerEnv: (name: string) => (name === 'VITE_SUPPORT_WHATSAPP' ? '9647811102199' : ''),
}));

import { POST } from '../preview/route.ts';

function previewRequest(body: Record<string, unknown>, ip = '203.0.113.21'): Request {
    return new Request('https://app.test/api/auth/otp/preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
        },
        body: JSON.stringify(body),
    });
}

describe('POST /api/auth/otp/preview', () => {
    beforeEach(() => {
        resetWifeRateLimitStoreForTests();
        lookup.mockReset();
        mx.mockReset();
        mx.mockResolvedValue(true);
        emailReady.mockReturnValue(true);
        waReady.mockReturnValue(false);
        lookup.mockResolvedValue({
            userId: 'user-1',
            email: 'a@gmail.com',
            phone: '07803344524',
            emailConfirmed: true,
        });
    });

    afterEach(() => {
        resetWifeRateLimitStoreForTests();
    });

    it('يرفض بريداً مؤقتاً قبل البحث عن الحساب', async () => {
        const res = await POST(
            previewRequest({ email: 'x@mailinator.com', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(400);
        expect(await res.json()).toMatchObject({ ok: false });
        expect(lookup).not.toHaveBeenCalled();
    });

    it('يرفض بريداً غير مسجّل', async () => {
        lookup.mockResolvedValueOnce(null);
        const res = await POST(
            previewRequest({ email: 'missing@gmail.com', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(404);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(String(json.error)).toMatch(/لا يوجد حساب/);
    });

    it('يعيد آخر رقمين دون معرّف المستخدم', async () => {
        const res = await POST(
            previewRequest({ email: 'a@gmail.com', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json).toMatchObject({
            ok: true,
            phoneTail: '24',
            hasWhatsAppNumber: true,
            emailReady: true,
            whatsappSendReady: false,
        });
        expect(json.userId).toBeUndefined();
        expect(String(json.adminWhatsappUrl)).toMatch(/wa\.me\/9647811102199/);
    });

    it('يرفض نطاقاً بلا بريد حقيقي', async () => {
        mx.mockResolvedValueOnce(false);
        const res = await POST(
            previewRequest({ email: 'nobody@not-a-real-isp.xyz', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(400);
        expect(String((await res.json()).error)).toMatch(/حقيقياً/);
        expect(lookup).not.toHaveBeenCalled();
    });
});
