/**
 * CaseShare في PROD: فشل API → fail-closed بلا سقوط إلى المستودع المحلي.
 * list/detail → [] / null؛ mutations → throw.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const updateStatus = vi.fn();
const endSession = vi.fn();
const listForUser = vi.fn();
const getById = vi.fn();
const createShare = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('../caseShareRepository', () => ({
    CaseShareRepository: {
        updateStatus: (...args: unknown[]) => updateStatus(...args),
        endSession: (...args: unknown[]) => endSession(...args),
        createShare: (...args: unknown[]) => createShare(...args),
        listForUser: (...args: unknown[]) => listForUser(...args),
        getById: (...args: unknown[]) => getById(...args),
    },
}));

vi.mock('../caseShareNetworkGuard', () => ({
    assertRecipientInNetwork: vi.fn().mockResolvedValue(true),
}));

import { CaseShareApiService } from '../caseShareApiService';

describe('CaseShareApiService — PROD fail-closed', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('PROD', true);
        vi.stubEnv('DEV', false);
        vi.stubEnv('MODE', 'production');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('listShares: API failure in PROD returns [] and does not call repository', async () => {
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        await expect(CaseShareApiService.listShares('user-1')).resolves.toEqual([]);
        expect(listForUser).not.toHaveBeenCalled();
    });

    it('listShares: empty/malformed API payload in PROD returns [] without repository', async () => {
        fetchSecure.mockResolvedValue({ ok: true, shares: null });
        await expect(CaseShareApiService.listShares('user-1')).resolves.toEqual([]);
        expect(listForUser).not.toHaveBeenCalled();
    });

    it('getShareDetail: API failure in PROD returns null and does not call repository', async () => {
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        await expect(CaseShareApiService.getShareDetail('share-1', 'user-1')).resolves.toBeNull();
        expect(getById).not.toHaveBeenCalled();
    });

    it('getShareDetail: missing share in PROD returns null without repository', async () => {
        fetchSecure.mockResolvedValue({ ok: true });
        await expect(CaseShareApiService.getShareDetail('share-1', 'user-1')).resolves.toBeNull();
        expect(getById).not.toHaveBeenCalled();
    });

    it('listShares: DEV keeps local repository fallback', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('DEV', true);
        vi.stubEnv('MODE', 'development');
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        listForUser.mockResolvedValue([{ id: 'local-1' }]);
        await expect(CaseShareApiService.listShares('user-1')).resolves.toEqual([{ id: 'local-1' }]);
        expect(listForUser).toHaveBeenCalledWith('user-1', { summary: true });
    });

    it('getShareDetail: DEV keeps local repository fallback', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('DEV', true);
        vi.stubEnv('MODE', 'development');
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        getById.mockResolvedValue({ id: 'local-detail' });
        await expect(CaseShareApiService.getShareDetail('share-1', 'user-1')).resolves.toEqual({
            id: 'local-detail',
        });
        expect(getById).toHaveBeenCalledWith('share-1', 'user-1');
    });

    it('respond: API failure in PROD rethrows and does not call repository', async () => {
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        await expect(CaseShareApiService.respond('share-1', 'accept', 'user-1')).rejects.toThrow(
            'NETWORK',
        );
        expect(updateStatus).not.toHaveBeenCalled();
    });

    it('endSession: API failure in PROD rethrows and does not call repository', async () => {
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        await expect(CaseShareApiService.endSession('share-1', 'user-1')).rejects.toThrow('NETWORK');
        expect(endSession).not.toHaveBeenCalled();
    });

    it('respond: DEV keeps local repository fallback', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('DEV', true);
        vi.stubEnv('MODE', 'development');
        fetchSecure.mockRejectedValue(new Error('NETWORK'));
        updateStatus.mockResolvedValue({ id: 'share-1', status: 'accepted' });
        await expect(CaseShareApiService.respond('share-1', 'accept', 'user-1')).resolves.toBeUndefined();
        expect(updateStatus).toHaveBeenCalledWith('share-1', 'user-1', 'accepted');
    });
});
