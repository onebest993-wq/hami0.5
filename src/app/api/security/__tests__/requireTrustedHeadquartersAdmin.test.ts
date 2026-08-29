import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { wifeJsonResponse } from '../wifeSecurityHeaders.ts';

const {
    requireWifeUserMock,
    isAdminRequestMock,
    isValidDeviceFingerprintMock,
    isAdminDeviceTrustedMock,
    isAdminDeviceStepUpFreshMock,
} = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    isAdminRequestMock: vi.fn(),
    isValidDeviceFingerprintMock: vi.fn(),
    isAdminDeviceTrustedMock: vi.fn(),
    isAdminDeviceStepUpFreshMock: vi.fn(),
}));

vi.mock('../bffAuth.ts', () => ({
    requireWifeUser: (...a: unknown[]) => requireWifeUserMock(...a),
    unwrapWifeUser: (r: unknown) => r,
}));

vi.mock('../adminCheck.ts', () => ({
    isAdminRequest: (...a: unknown[]) => isAdminRequestMock(...a),
}));

vi.mock('../adminOtpStore.ts', () => ({
    isValidDeviceFingerprint: (...a: unknown[]) => isValidDeviceFingerprintMock(...a),
    isAdminDeviceTrusted: (...a: unknown[]) => isAdminDeviceTrustedMock(...a),
    isAdminDeviceStepUpFresh: (...a: unknown[]) => isAdminDeviceStepUpFreshMock(...a),
}));

import { requireTrustedHeadquartersAdmin } from '../requireTrustedHeadquartersAdmin.ts';

const ANDROID_WV =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36';

function req(headers: Record<string, string> = {}, url = 'https://app.test/api/admin/users'): Request {
    return new Request(url, {
        method: 'GET',
        headers,
    });
}

describe('requireTrustedHeadquartersAdmin', () => {
    beforeEach(() => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'admin-1' });
        isAdminRequestMock.mockResolvedValue(true);
        isValidDeviceFingerprintMock.mockReturnValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        isAdminDeviceStepUpFreshMock.mockResolvedValue(true);
    });
    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.HAMI_HQ_HOSTS;
        delete process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT;
        delete process.env.VERCEL_ENV;
    });

    it('يرفض جلسة WIFE الفاشلة', async () => {
        requireWifeUserMock.mockResolvedValue({
            ok: false,
            response: wifeJsonResponse(401, { ok: false, error: 'unauth' }),
        });
        const gate = await requireTrustedHeadquartersAdmin(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(401);
    });

    it('يرفض غير المدير', async () => {
        isAdminRequestMock.mockResolvedValue(false);
        const gate = await requireTrustedHeadquartersAdmin(req({ 'x-wife-device-id': 'deviceok1' }));
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
    });

    it('يرفض جهازاً غير صالح', async () => {
        isValidDeviceFingerprintMock.mockReturnValue(false);
        const gate = await requireTrustedHeadquartersAdmin(req({ 'x-wife-device-id': 'x' }));
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
        await expect(gate.response.json()).resolves.toMatchObject({ error: 'Trusted device required' });
    });

    it('يرفض جهازاً غير موثّق OTP', async () => {
        isAdminDeviceTrustedMock.mockResolvedValue(false);
        const gate = await requireTrustedHeadquartersAdmin(req({ 'x-wife-device-id': 'deviceok1' }));
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
    });

    it('يأذن لمدير بجهاز موثّق', async () => {
        const gate = await requireTrustedHeadquartersAdmin(req({ 'x-wife-device-id': 'deviceok1' }));
        expect(gate).toEqual({ ok: true, userId: 'admin-1', deviceFingerprint: 'deviceok1' });
        expect(isAdminDeviceStepUpFreshMock).not.toHaveBeenCalled();
    });

    it('يرفض الفعل الخطير إذا انتهت نافذة رمز التحقق', async () => {
        isAdminDeviceStepUpFreshMock.mockResolvedValue(false);
        const gate = await requireTrustedHeadquartersAdmin(req({ 'x-wife-device-id': 'deviceok1' }), {
            stepUp: true,
        });
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
        await expect(gate.response.json()).resolves.toMatchObject({
            code: 'HQ_STEP_UP_REQUIRED',
        });
    });

    it('يرفض عميل المحامي الأصلي بـ 404 قبل جلسة WIFE', async () => {
        const gate = await requireTrustedHeadquartersAdmin(req({ 'user-agent': ANDROID_WV }));
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(404);
        expect(requireWifeUserMock).not.toHaveBeenCalled();
    });

    it('يرفض مضيفاً خارج HAMI_HQ_HOSTS بـ 404', async () => {
        process.env.HAMI_HQ_HOSTS = 'hq.secret.test';
        const gate = await requireTrustedHeadquartersAdmin(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(404);
        expect(requireWifeUserMock).not.toHaveBeenCalled();
    });

    it('يرفض مقر القيادة على Vercel العام قبل الجلسة', async () => {
        process.env.VERCEL_ENV = 'production';
        const gate = await requireTrustedHeadquartersAdmin(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(404);
        expect(requireWifeUserMock).not.toHaveBeenCalled();
    });
});
