import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requireHeadquartersCookieAuthMock, isAdminDeviceTrustedMock, isValidDeviceFingerprintMock } = vi.hoisted(
    () => ({
        requireHeadquartersCookieAuthMock: vi.fn(),
        isAdminDeviceTrustedMock: vi.fn(),
        isValidDeviceFingerprintMock: vi.fn(),
    }),
);

vi.mock('../../../security/requireHeadquartersCookieAuth.ts', () => ({
    requireHeadquartersCookieAuth: (...a: unknown[]) => requireHeadquartersCookieAuthMock(...a),
}));

vi.mock('../../../security/adminOtpStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../security/adminOtpStore.ts')>();
    return {
        ...actual,
        isAdminDeviceTrusted: (...a: unknown[]) => isAdminDeviceTrustedMock(...a),
        isValidDeviceFingerprint: (...a: unknown[]) => isValidDeviceFingerprintMock(...a),
        deviceFingerprintMatchesRequest: () => true,
    };
});

import { GET } from './route.ts';

const DEVICE = 'hqotpdevice01';

function req(): Request {
    return new Request(`https://app.test/api/admin/otp/status?deviceFingerprint=${DEVICE}`, {
        method: 'GET',
        headers: { Origin: 'https://app.test' },
    });
}

describe('GET /api/admin/otp/status', () => {
    beforeEach(() => {
        isValidDeviceFingerprintMock.mockReturnValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(false);
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('بدون جلسة يعيد 200 sessionRequired ولا 401', async () => {
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), { status: 401 }),
        });
        const res = await GET(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({
            ok: true,
            trusted: false,
            sessionRequired: true,
        });
        expect(isAdminDeviceTrustedMock).not.toHaveBeenCalled();
    });

    it('غير المدير يبقى 403', async () => {
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false, error: 'Unauthorized Access' }), { status: 403 }),
        });
        const res = await GET(req());
        expect(res.status).toBe(403);
        expect(isAdminDeviceTrustedMock).not.toHaveBeenCalled();
    });

    it('مدير بجهاز موثّق يعيد trusted:true', async () => {
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const res = await GET(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, trusted: true });
    });
});
