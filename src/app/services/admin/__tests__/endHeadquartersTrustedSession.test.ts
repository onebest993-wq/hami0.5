import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const revokeDeviceTrust = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: { revokeDeviceTrust: (...a: unknown[]) => revokeDeviceTrust(...a) },
}));

import { endHeadquartersTrustedSession } from '../endHeadquartersTrustedSession';
import {
    clearPrimedHeadquartersStatus,
    peekPrimedHeadquartersStatus,
    primeHeadquartersLiveStatus,
} from '../hqDevSessionPrime';
import { markHqStatusFetched, parseHeadquartersLiveStatus } from '@/app/components/admin/hqLiveOverview';

describe('endHeadquartersTrustedSession', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        revokeDeviceTrust.mockReset();
        clearPrimedHeadquartersStatus();
    });

    it('يمسح الكاش المحلي بعد سحب ثقة الجهاز على الخادم', async () => {
        primeHeadquartersLiveStatus(
            markHqStatusFetched(
                parseHeadquartersLiveStatus({ ok: true, system: 'connected', db: true, kvOk: true }),
                '2026-01-01T00:00:00.000Z',
            ),
        );
        fetchSecure.mockResolvedValue({ ok: true, action: 'revoked' });
        await expect(endHeadquartersTrustedSession()).resolves.toEqual({ revoked: true });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/devices',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ action: 'revoke_current' }),
            }),
        );
        expect(revokeDeviceTrust).toHaveBeenCalledTimes(1);
        expect(fetchSecure.mock.invocationCallOrder[0]).toBeLessThan(revokeDeviceTrust.mock.invocationCallOrder[0]);
        expect(peekPrimedHeadquartersStatus()).toBeNull();
    });

    it('لا يمسح الكاش المحلي إذا فشل الخادم حتى يبقى الجهاز موثّقاً', async () => {
        fetchSecure.mockRejectedValue(new Error('offline'));
        await expect(endHeadquartersTrustedSession()).resolves.toEqual({ revoked: false });
        expect(revokeDeviceTrust).not.toHaveBeenCalled();
    });

    it('لا يمسح الكاش إذا ردّ الخادم بدون ok', async () => {
        fetchSecure.mockResolvedValue({ ok: false });
        await expect(endHeadquartersTrustedSession()).resolves.toEqual({ revoked: false });
        expect(revokeDeviceTrust).not.toHaveBeenCalled();
    });
});
