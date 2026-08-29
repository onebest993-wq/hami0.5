import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nativeFetch = vi.fn();
const fetchSecure = vi.fn();

vi.mock('@/app/security/wifeNativeFetch', () => ({
    getWifeNativeFetch: () => nativeFetch,
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: {
        getDeviceFingerprint: () => 'hqdevdevice01',
        trustThisDevice: vi.fn(),
    },
}));

vi.mock('@/app/utils/authStorage', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/authStorage')>();
    return {
        ...actual,
        readDevMockAccessToken: () => 'dev-access-token-a2532b41-add9-463f-9447-b6f933a79fea',
    };
});

vi.mock('@/app/security/ensureCsrfSessionReady', () => ({
    invalidateCsrfSessionReady: vi.fn(),
    markCsrfSessionReadyFromServer: vi.fn(() => false),
}));

vi.mock('@/app/utils/bffWifeSign', () => ({
    clearWifeSignAuthCircuit: vi.fn(),
}));

vi.mock('@/app/services/SecureAPIClient', () => ({
    clearSecureApiAuthPause: vi.fn(),
    SecureAPIClient: {
        fetchSecure: (...a: unknown[]) => fetchSecure(...a),
    },
}));

vi.mock('@/app/security/csrfSession', () => ({
    setCsrfSessionTokenFromServer: vi.fn(),
}));

vi.mock('@/app/utils/bffCryptoSession', () => ({
    setBffCryptoWrapCredential: vi.fn(),
}));

import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { setCsrfSessionTokenFromServer } from '@/app/security/csrfSession';
import { invalidateCsrfSessionReady, markCsrfSessionReadyFromServer } from '@/app/security/ensureCsrfSessionReady';
import { clearSecureApiAuthPause } from '@/app/services/SecureAPIClient';
import { clearWifeSignAuthCircuit } from '@/app/utils/bffWifeSign';
import { clearPrimedHeadquartersStatus, peekPrimedHeadquartersCourts, peekPrimedHeadquartersStatus } from '../hqDevSessionPrime';
import { bootstrapHeadquartersDevSession } from '../hqDevSessionBootstrap';

describe('bootstrapHeadquartersDevSession', () => {
    beforeEach(() => {
        nativeFetch.mockReset();
        fetchSecure.mockReset();
        fetchSecure.mockImplementation(async (path: string) => {
            if (String(path).includes('/api/admin/stats')) {
                return { ok: true, courts: [{ court: 'بغداد', lawsuits: 2, transactions: 1 }] };
            }
            if (String(path).includes('/api/admin/audit')) return { ok: true, entries: [] };
            if (String(path).includes('/api/admin/devices')) return { ok: true, devices: [] };
            return { ok: true, system: 'connected', db: true, kvOk: true };
        });
        clearPrimedHeadquartersStatus();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('يثبّت الجهاز محلياً بعد نجاح الإقلاع', async () => {
        nativeFetch.mockResolvedValue(
            new Response(
                JSON.stringify({
                    ok: true,
                    csrfToken: 'csrf-1',
                    cryptoWrapCredential: 'bff:wrap',
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
        );
        await expect(bootstrapHeadquartersDevSession()).resolves.toBe(true);
        expect(nativeFetch).toHaveBeenCalledWith(
            '/api/admin/otp/dev-unlock',
            expect.objectContaining({
                method: 'POST',
                credentials: 'include',
            }),
        );
        expect(DeviceTrustService.trustThisDevice).toHaveBeenCalledWith('hqdevdevice01');
        expect(setCsrfSessionTokenFromServer).toHaveBeenCalledWith('csrf-1');
        expect(markCsrfSessionReadyFromServer).toHaveBeenCalledWith('csrf-1');
        expect(invalidateCsrfSessionReady).toHaveBeenCalled();
        expect(clearSecureApiAuthPause).toHaveBeenCalled();
        expect(clearWifeSignAuthCircuit).toHaveBeenCalled();
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/status',
            expect.objectContaining({ method: 'GET' }),
        );
        expect(peekPrimedHeadquartersStatus()?.system).toBe('connected');
        expect(peekPrimedHeadquartersStatus()?.sessionRequired).toBe(false);
        expect(peekPrimedHeadquartersCourts()?.[0]?.court).toBe('بغداد');
    });

    it('يفشل بصمت إن رفض الخادم', async () => {
        nativeFetch.mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 403 }));
        await expect(bootstrapHeadquartersDevSession()).resolves.toBe(false);
        expect(DeviceTrustService.trustThisDevice).not.toHaveBeenCalled();
    });
});
