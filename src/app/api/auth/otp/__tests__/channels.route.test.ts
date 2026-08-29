import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWifeRateLimitStoreForTests } from '../../../security/wifeRateLimitStore.ts';

const emailReady = vi.fn(() => true);
const waReady = vi.fn(() => false);

vi.mock('../authOtpChannels.ts', () => ({
    isAuthOtpEmailChannelReady: () => emailReady(),
    isAuthOtpWhatsAppChannelReady: () => waReady(),
}));

import { GET } from '../channels/route.ts';

function channelsRequest(ip = '203.0.113.40'): Request {
    return new Request('https://app.test/api/auth/otp/channels', {
        method: 'GET',
        headers: { 'x-forwarded-for': ip },
    });
}

describe('GET /api/auth/otp/channels', () => {
    beforeEach(() => {
        resetWifeRateLimitStoreForTests();
        emailReady.mockReturnValue(true);
        waReady.mockReturnValue(false);
    });

    afterEach(() => {
        resetWifeRateLimitStoreForTests();
    });

    it('يعيد جاهزية واتساب دون أسرار', async () => {
        const res = await GET(channelsRequest());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, email: true, whatsapp: false });
    });

    it('يعلن واتساب عند ضبط القناة', async () => {
        waReady.mockReturnValue(true);
        const res = await GET(channelsRequest());
        expect(await res.json()).toMatchObject({ ok: true, whatsapp: true });
    });
});
