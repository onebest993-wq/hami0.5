import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    isAdminUserIdMock,
    getVerifiedTokenSubjectMock,
    trustAdminDeviceMock,
    grantDevTrustMock,
    issueCsrfMock,
    consumeRateLimitMock,
} = vi.hoisted(() => ({
    isAdminUserIdMock: vi.fn(),
    getVerifiedTokenSubjectMock: vi.fn(),
    trustAdminDeviceMock: vi.fn(),
    grantDevTrustMock: vi.fn(),
    issueCsrfMock: vi.fn(),
    consumeRateLimitMock: vi.fn(),
}));

vi.mock('../../../security/adminCheck.ts', () => ({
    isAdminUserId: (...a: unknown[]) => isAdminUserIdMock(...a),
}));

vi.mock('../../../security/wifeValidator.ts', () => ({
    getVerifiedTokenSubject: (...a: unknown[]) => getVerifiedTokenSubjectMock(...a),
}));

vi.mock('../../../security/adminOtpStore.ts', () => ({
    deviceFingerprintMatchesRequest: () => true,
    isValidDeviceFingerprint: (v: unknown) => typeof v === 'string' && v.length >= 8,
    trustAdminDevice: (...a: unknown[]) => trustAdminDeviceMock(...a),
    grantDevHeadquartersDeviceTrust: (...a: unknown[]) => grantDevTrustMock(...a),
}));

vi.mock('../../../security/csrfServerStore.ts', () => ({
    issueCsrfTokenForSubject: (...a: unknown[]) => issueCsrfMock(...a),
}));

vi.mock('../../../security/wifeRateLimitStore.ts', () => ({
    consumeRateLimitSlot: (...a: unknown[]) => consumeRateLimitMock(...a),
}));

vi.mock('../../../security/cryptoWrapServer.ts', () => ({
    deriveClientCryptoWrapCredential: async () => 'bff:wrap',
}));

import { HAMI_PLATFORM_ADMIN_UUID } from '../../../security/roleResolver.ts';
import { headquartersDevAccessTokenFor } from '../../../security/hqDevUnlock.ts';
import { POST } from './route.ts';

const DEVICE = 'hqdevdevice01';
const TOKEN = headquartersDevAccessTokenFor(HAMI_PLATFORM_ADMIN_UUID);

function req(init?: { token?: string | null; env?: string; origin?: string; body?: unknown }): Request {
    const headers = new Headers({
        Origin: init?.origin ?? 'https://app.test',
        'Content-Type': 'application/json',
        'x-wife-device-id': DEVICE,
    });
    if (init?.token !== null) {
        headers.set('Authorization', `Bearer ${init?.token ?? TOKEN}`);
    }
    return new Request('https://app.test/api/admin/otp/dev-unlock', {
        method: 'POST',
        headers,
        body: JSON.stringify(init?.body ?? { deviceFingerprint: DEVICE }),
    });
}

describe('POST /api/admin/otp/dev-unlock', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        isAdminUserIdMock.mockResolvedValue(true);
        getVerifiedTokenSubjectMock.mockResolvedValue(HAMI_PLATFORM_ADMIN_UUID);
        trustAdminDeviceMock.mockResolvedValue({ ok: true, expiresAt: '2099-01-01T00:00:00.000Z' });
        grantDevTrustMock.mockReturnValue('2099-01-01T00:00:00.000Z');
        issueCsrfMock.mockResolvedValue('csrf-dev-unlock');
        consumeRateLimitMock.mockResolvedValue(true);
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        vi.clearAllMocks();
    });

    it('404 في الإنتاج', async () => {
        process.env.NODE_ENV = 'production';
        const res = await POST(req());
        expect(res.status).toBe(404);
        expect(trustAdminDeviceMock).not.toHaveBeenCalled();
        expect(res.headers.getSetCookie?.().some((c) => c.includes('hami_access_token=')) ?? false).toBe(
            false,
        );
    });

    it('يرفض بلا توكن تطوير', async () => {
        const res = await POST(req({ token: null }));
        expect(res.status).toBe(403);
        expect(trustAdminDeviceMock).not.toHaveBeenCalled();
    });

    it('يرفض JWT حياً حتى لو كان المدير', async () => {
        const res = await POST(req({ token: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhIn0.x' }));
        expect(res.status).toBe(403);
        expect(getVerifiedTokenSubjectMock).not.toHaveBeenCalled();
    });

    it('يثبّت الكوكي ويثق بالجهاز في التطوير', async () => {
        const res = await POST(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            userId: HAMI_PLATFORM_ADMIN_UUID,
            csrfToken: 'csrf-dev-unlock',
        });
        expect(trustAdminDeviceMock).toHaveBeenCalledWith({
            userId: HAMI_PLATFORM_ADMIN_UUID,
            deviceFingerprint: DEVICE,
            label: 'hq-dev-shortcut',
        });
        expect(grantDevTrustMock).toHaveBeenCalledWith(HAMI_PLATFORM_ADMIN_UUID, DEVICE);
        const cookies = res.headers.getSetCookie();
        expect(cookies.some((c) => c.includes('hami_access_token=') && c.includes('HttpOnly'))).toBe(true);
        expect(cookies.some((c) => c.includes('hami_refresh_token='))).toBe(true);
        expect(cookies.some((c) => c.includes('hami_csrf_token='))).toBe(true);
    });
});
