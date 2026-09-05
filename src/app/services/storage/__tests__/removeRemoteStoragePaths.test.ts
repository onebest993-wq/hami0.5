import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const isLawyerWorkCloudLive = vi.fn(() => false);

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
}));

import {
    isRemoteStorageObjectPath,
    removeRemoteStoragePathsBestEffort,
} from '@/app/services/storage/removeRemoteStoragePaths';

describe('removeRemoteStoragePaths', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        isLawyerWorkCloudLive.mockReturnValue(false);
    });

    it('لا يعتبر مسارات IDB/محلية كائنات سحابية', () => {
        expect(isRemoteStorageObjectPath('idb:vault:u1:d1')).toBe(false);
        expect(isRemoteStorageObjectPath('idb:forum:d1')).toBe(false);
        expect(isRemoteStorageObjectPath('local:vault:u1:d1')).toBe(false);
        expect(isRemoteStorageObjectPath('u1/vault/doc.pdf')).toBe(true);
    });

    it('لا يستدعي الشبكة ومزامنة العمل مطفأة', async () => {
        await removeRemoteStoragePathsBestEffort(['u1/vault/doc.pdf']);
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('يحذف المسار السحابي فقط عند المزامنة', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        fetchSecure.mockResolvedValue({ ok: true });
        await removeRemoteStoragePathsBestEffort(['idb:vault:u1:d1', 'u1/vault/doc.pdf']);
        expect(fetchSecure).toHaveBeenCalledTimes(1);
        expect(fetchSecure.mock.calls[0]?.[0]).toBe('/api/upload/remove');
        expect(JSON.parse(String(fetchSecure.mock.calls[0]?.[1]?.body))).toEqual({
            paths: ['u1/vault/doc.pdf'],
        });
    });
});
