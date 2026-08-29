import { afterEach, describe, expect, it, vi } from 'vitest';

const { fromMock, getClientMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
    getClientMock: vi.fn(),
}));

vi.mock('../supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

import {
    createAdminOtpChallenge,
    consumeAdminOtpChallenge,
    deviceFingerprintMatchesRequest,
    generateAdminOtpCode,
    hashAdminOtpCode,
    isAdminDeviceTrusted,
    grantDevHeadquartersDeviceTrust,
    resetDevHeadquartersDeviceTrustForTests,
    listAdminTrustedDevices,
    resolveAdminOtpPepper,
    revokeAdminTrustedDevice,
    revokeAdminTrustedDeviceByFingerprint,
} from '../adminOtpStore.ts';

describe('adminOtpStore pepper + rotation', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.clearAllMocks();
        resetDevHeadquartersDeviceTrustForTests();
    });

    it('يفشل مغلقاً في الإنتاج بلا ADMIN_OTP_PEPPER', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        vi.stubEnv('ADMIN_OTP_PEPPER', '');
        vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-which-must-not-be-pepper');
        expect(resolveAdminOtpPepper()).toBeNull();
        expect(() => hashAdminOtpCode('123456')).toThrow(/ADMIN_OTP_PEPPER/);
        const created = await createAdminOtpChallenge({
            userId: 'u1',
            deviceFingerprint: 'deviceok1',
        });
        expect(created).toMatchObject({ error: expect.stringMatching(/not configured|PEPPER/i) });
        const consumed = await consumeAdminOtpChallenge({
            userId: 'u1',
            deviceFingerprint: 'deviceok1',
            code: '123456',
        });
        expect(consumed).toEqual({ ok: false, error: 'رمز غير صالح أو منتهٍ' });
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('يبطل الرموز غير المستخدمة قبل إدراج رمز جديد', async () => {
        vi.stubEnv('NODE_ENV', 'test');
        vi.stubEnv('ADMIN_OTP_PEPPER', 'unit-test-otp-pepper-16');
        const isChain = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockResolvedValue({ error: null }),
        };
        const update = vi.fn(() => ({
            eq: vi.fn(() => ({
                eq: vi.fn(() => isChain),
            })),
        }));
        const insert = vi.fn().mockResolvedValue({ error: null });
        fromMock.mockReturnValue({ update, insert });
        getClientMock.mockReturnValue({ from: fromMock });

        const created = await createAdminOtpChallenge({
            userId: 'u1',
            deviceFingerprint: 'deviceok1',
        });
        expect(created).toMatchObject({ code: expect.stringMatching(/^[1-9]{6}$/) });
        expect(update).toHaveBeenCalled();
        expect(insert).toHaveBeenCalled();
    });

    it('يولد رموز تأكيد من 1–9 فقط حتى تنعكس حيلة المقر', () => {
        for (let i = 0; i < 40; i += 1) {
            expect(generateAdminOtpCode()).toMatch(/^[1-9]{6}$/);
        }
    });

    it('يستهلك الرمز بتحديث ذري واحد', async () => {
        vi.stubEnv('NODE_ENV', 'test');
        vi.stubEnv('ADMIN_OTP_PEPPER', 'unit-test-otp-pepper-16');
        const maybeSingle = vi.fn(async () => ({ data: { id: 'chal-1' }, error: null }));
        const chain = {
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            gt: vi.fn().mockReturnThis(),
            select: vi.fn(() => ({ maybeSingle })),
        };
        const update = vi.fn(() => chain);
        fromMock.mockReturnValue({ update });
        getClientMock.mockReturnValue({ from: fromMock });

        const consumed = await consumeAdminOtpChallenge({
            userId: 'u1',
            deviceFingerprint: 'deviceok1',
            code: '123456',
        });
        expect(consumed).toEqual({ ok: true });
        expect(maybeSingle).toHaveBeenCalled();
    });

    it('isAdminDeviceTrusted يقبل صفاً واحداً من maybeSingle أو مصفوفة', async () => {
        const maybeSingle = vi.fn(async () => ({ data: { id: 'dev-row-1' }, error: null }));
        const updateEq = vi.fn().mockResolvedValue({ error: null });
        fromMock.mockReturnValue({
            select: () => ({
                eq: () => ({
                    eq: () => ({
                        is: () => ({
                            gt: () => ({
                                limit: () => ({ maybeSingle }),
                            }),
                        }),
                    }),
                }),
            }),
            update: () => ({ eq: updateEq }),
        });
        getClientMock.mockReturnValue({ from: fromMock });
        await expect(
            isAdminDeviceTrusted({ userId: 'u1', deviceFingerprint: 'deviceok1' }),
        ).resolves.toBe(true);

        maybeSingle.mockResolvedValueOnce({ data: [{ id: 'dev-row-2' }], error: null });
        await expect(
            isAdminDeviceTrusted({ userId: 'u1', deviceFingerprint: 'deviceok1' }),
        ).resolves.toBe(true);
    });

    it('يربط بصمة الجهاز برأس الطلب في الإنتاج', () => {
        vi.stubEnv('NODE_ENV', 'production');
        const matched = new Request('https://app.test/api/admin/otp/status', {
            headers: { 'x-wife-device-id': 'deviceok1' },
        });
        expect(deviceFingerprintMatchesRequest(matched, 'deviceok1')).toBe(true);
        expect(deviceFingerprintMatchesRequest(matched, 'otherdev1')).toBe(false);
        expect(
            deviceFingerprintMatchesRequest(new Request('https://app.test/api/admin/otp/status'), 'deviceok1'),
        ).toBe(false);
    });

    it('يعيد تلميح البصمة فقط عند سرد الأجهزة الموثّقة', async () => {
        const fingerprint = 'admin-device-fingerprint-secret-value';
        fromMock.mockReturnValue({
            select: () => ({
                eq: () => ({
                    is: () => ({
                        order: () => ({
                            limit: async () => ({
                                data: [
                                    {
                                        id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
                                        device_fingerprint: fingerprint,
                                        label: null,
                                        trusted_at: '2026-08-01T00:00:00.000Z',
                                        expires_at: '2099-01-01T00:00:00.000Z',
                                        last_seen_at: '2026-08-01T00:00:00.000Z',
                                    },
                                ],
                                error: null,
                            }),
                        }),
                    }),
                }),
            }),
        });
        getClientMock.mockReturnValue({ from: fromMock });
        const devices = await listAdminTrustedDevices({
            userId: '11111111-2222-4333-8444-555555555555',
            currentFingerprint: fingerprint,
        });
        expect(devices).toHaveLength(1);
        expect(devices[0]?.hint).toBe('admi…alue');
        expect(devices[0]?.current).toBe(true);
        expect(JSON.stringify(devices)).not.toContain(fingerprint);
    });

    it('يسحب الثقة فقط لجهاز المستخدم الحالي', async () => {
        const maybeSingle = vi.fn(async () => ({
            data: { id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff' },
            error: null,
        }));
        const isChain = {
            is: vi.fn(() => ({
                select: vi.fn(() => ({ maybeSingle })),
            })),
        };
        const eqUser = vi.fn(() => isChain);
        const eqId = vi.fn(() => ({ eq: eqUser }));
        fromMock.mockReturnValue({
            update: () => ({ eq: eqId }),
        });
        getClientMock.mockReturnValue({ from: fromMock });
        await expect(
            revokeAdminTrustedDevice({
                userId: '11111111-2222-4333-8444-555555555555',
                deviceId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
            }),
        ).resolves.toBe('ok');
        expect(eqId).toHaveBeenCalledWith('id', 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff');
        expect(eqUser).toHaveBeenCalledWith('user_id', '11111111-2222-4333-8444-555555555555');
    });

    it('يسحب ثقة الجهاز الحالي ببصمة الطلب لا بمعرّف صف', async () => {
        const maybeSingle = vi.fn(async () => ({
            data: { id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff' },
            error: null,
        }));
        const isChain = {
            is: vi.fn(() => ({
                select: vi.fn(() => ({ maybeSingle })),
            })),
        };
        const eqUser = vi.fn(() => isChain);
        const eqFingerprint = vi.fn(() => ({ eq: eqUser }));
        fromMock.mockReturnValue({
            update: () => ({ eq: eqFingerprint }),
        });
        getClientMock.mockReturnValue({ from: fromMock });
        await expect(
            revokeAdminTrustedDeviceByFingerprint({
                userId: '11111111-2222-4333-8444-555555555555',
                deviceFingerprint: 'deviceok1',
            }),
        ).resolves.toBe('ok');
        expect(eqFingerprint).toHaveBeenCalledWith('device_fingerprint', 'deviceok1');
        expect(eqUser).toHaveBeenCalledWith('user_id', '11111111-2222-4333-8444-555555555555');
    });

    it('ثقة اختصار التطوير تُقبل بلا صف قاعدة وتُمسح عند إنهاء الجلسة', async () => {
        getClientMock.mockReturnValue(null);
        grantDevHeadquartersDeviceTrust('11111111-2222-4333-8444-555555555555', 'deviceok1');
        await expect(
            isAdminDeviceTrusted({
                userId: '11111111-2222-4333-8444-555555555555',
                deviceFingerprint: 'deviceok1',
            }),
        ).resolves.toBe(true);
        await expect(
            revokeAdminTrustedDeviceByFingerprint({
                userId: '11111111-2222-4333-8444-555555555555',
                deviceFingerprint: 'deviceok1',
            }),
        ).resolves.toBe('missing');
        await expect(
            isAdminDeviceTrusted({
                userId: '11111111-2222-4333-8444-555555555555',
                deviceFingerprint: 'deviceok1',
            }),
        ).resolves.toBe(false);
    });
});
