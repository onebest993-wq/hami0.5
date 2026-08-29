import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWifeRateLimitStoreForTests } from '../../../security/wifeRateLimitStore.ts';

const lookup = vi.fn();
const createChallenge = vi.fn();
const deliver = vi.fn();
const emailReady = vi.fn(() => true);
const waReady = vi.fn(() => true);
const mx = vi.fn(async () => true);

vi.mock('../authOtpLookup.ts', () => ({
    lookupAuthOtpAccountByEmail: (...args: unknown[]) => lookup(...args),
}));

vi.mock('../authOtpStore.ts', () => ({
    createAuthOtpChallenge: (...args: unknown[]) => createChallenge(...args),
}));

vi.mock('../authOtpChannels.ts', () => ({
    deliverAuthOtp: (...args: unknown[]) => deliver(...args),
    isAuthOtpEmailChannelReady: () => emailReady(),
    isAuthOtpWhatsAppChannelReady: () => waReady(),
}));

vi.mock('../authOtpEmailMx.ts', () => ({
    emailDomainAcceptsMail: (...args: unknown[]) => mx(...args),
}));

vi.mock('../../../security/sessionCookie.ts', () => ({
    getSupabaseAuthConfigFromEnv: () => ({ url: 'https://auth.test', key: 'anon' }),
}));

import { POST } from '../request/route.ts';

function otpRequest(body: Record<string, unknown>, ip = '203.0.113.9'): Request {
    return new Request('https://app.test/api/auth/otp/request', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
        },
        body: JSON.stringify(body),
    });
}

describe('POST /api/auth/otp/request', () => {
    beforeEach(() => {
        resetWifeRateLimitStoreForTests();
        lookup.mockReset();
        createChallenge.mockReset();
        deliver.mockReset();
        mx.mockReset();
        mx.mockResolvedValue(true);
        emailReady.mockReturnValue(true);
        waReady.mockReturnValue(true);
        lookup.mockResolvedValue({
            userId: 'user-1',
            email: 'a@gmail.com',
            phone: '07803344524',
            emailConfirmed: true,
        });
        createChallenge.mockResolvedValue({ code: '123456', expiresAt: new Date().toISOString() });
        deliver.mockResolvedValue({ ok: true });
    });

    afterEach(() => {
        resetWifeRateLimitStoreForTests();
        vi.unstubAllGlobals();
    });

    it('يرفض واتساب غير المضبوط بعد التأكد من الحساب', async () => {
        waReady.mockReturnValue(false);
        const res = await POST(
            otpRequest({ email: 'a@gmail.com', channel: 'whatsapp', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(String(json.error)).toMatch(/واتساب/);
        expect(lookup).toHaveBeenCalled();
        expect(createChallenge).not.toHaveBeenCalled();
    });

    it('يرسل الرمز ويعيد آخر رقمين دون كشف المعرّف', async () => {
        const res = await POST(
            otpRequest({ email: 'a@gmail.com', channel: 'email', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.ok).toBe(true);
        expect(json.delivery).toBe('otp');
        expect(json.phoneTail).toBe('24');
        expect(json.message).toMatch(/بريدك/);
        expect(json.message).not.toMatch(/user-1|0780/);
        expect(createChallenge).toHaveBeenCalled();
        expect(deliver).toHaveBeenCalled();
    });

    it('يعلن غياب الحساب بدل ردّ عام', async () => {
        lookup.mockResolvedValueOnce(null);
        const res = await POST(
            otpRequest({ email: 'missing@gmail.com', channel: 'email', purpose: 'email_confirm' }),
        );
        expect(res.status).toBe(404);
        expect(await res.json()).toMatchObject({ ok: false });
        expect(createChallenge).not.toHaveBeenCalled();
    });

    it('يرفض واتساب بلا رقم على الحساب', async () => {
        lookup.mockResolvedValueOnce({
            userId: 'user-1',
            email: 'a@gmail.com',
            phone: null,
            emailConfirmed: true,
        });
        const res = await POST(
            otpRequest({ email: 'a@gmail.com', channel: 'whatsapp', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(400);
        expect(String((await res.json()).error)).toMatch(/واتساب/);
        expect(createChallenge).not.toHaveBeenCalled();
    });

    it('عند المرسل التجريبي يحوّل الاستعادة إلى رابط بدل حصرها على صندوق المدير', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
        vi.stubGlobal('fetch', fetchMock);
        deliver.mockResolvedValueOnce({
            ok: false,
            error: 'مرسل البريد التجريبي لا يوصل الرمز إلا إلى صندوق إعداد الخدمة.',
        });
        const res = await POST(
            otpRequest({ email: 'a@gmail.com', channel: 'email', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.delivery).toBe('link');
        expect(String(json.message)).toMatch(/رابط استعادة|ليس لأن الاستعادة/);
        expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/auth\/v1\/recover/);
    });

    it('يُظهر فشل الإرسال غير التجريبي بدل إكمال شاشة الرمز دون رسالة', async () => {
        deliver.mockResolvedValueOnce({
            ok: false,
            error: 'فشل إرسال الرمز عبر Resend: domain not verified',
        });
        const res = await POST(
            otpRequest({ email: 'a@gmail.com', channel: 'email', purpose: 'password_reset' }),
        );
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(String(json.error)).toMatch(/Resend|domain/);
    });
});
