import { beforeEach, describe, expect, it, vi } from 'vitest';

const kvSet = vi.fn();
const kvGet = vi.fn();
const kvGetByPrefix = vi.fn();
const isLawyerWorkCloudLive = vi.fn(() => false);
const isLiveCloudSyncBucketEnabled = vi.fn(() => false);

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        set: (...args: unknown[]) => kvSet(...args),
        get: (...args: unknown[]) => kvGet(...args),
        getByPrefix: (...args: unknown[]) => kvGetByPrefix(...args),
    },
    uuidv4: () => 'id-local-1',
}));

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: (bucket: 'notes' | 'files' | 'execution') =>
        isLiveCloudSyncBucketEnabled(bucket),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => undefined),
    },
}));

import { LawyerDB } from '@/app/services/lawyerDbRuntime';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('LawyerDB work-cloud isolation', () => {
    beforeEach(() => {
        kvSet.mockReset();
        kvGet.mockReset();
        kvGetByPrefix.mockReset();
        isLawyerWorkCloudLive.mockReset().mockReturnValue(false);
        isLiveCloudSyncBucketEnabled.mockReset().mockReturnValue(false);
        vi.mocked(SecureStoreService.getItem).mockResolvedValue(null);
        vi.mocked(SecureStoreService.setItem).mockResolvedValue(undefined);
    });

    it('يحفظ القضايا والملاحظات والمواعيد محلياً دون KV عندما المزامنة مطفأة', async () => {
        await LawyerDB.saveCase('u1', { title: 'دعوى' });
        await LawyerDB.saveNote('u1', { text: 'ملاحظة' });
        await LawyerDB.saveDeadline('u1', { date: '2026-09-01' });
        await LawyerDB.getCases('u1');
        await LawyerDB.getNotes('u1');
        await LawyerDB.getDeadlines('u1');
        expect(kvSet).not.toHaveBeenCalled();
        expect(kvGetByPrefix).not.toHaveBeenCalled();
        expect(SecureStoreService.setItem).toHaveBeenCalled();
    });

    it('يبقي الملف المهني على KV حتى والمزامنة المحلية مطفأة', async () => {
        kvSet.mockResolvedValue(undefined);
        kvGet.mockResolvedValue({ name: 'محامي' });
        await LawyerDB.saveUserProfile('u1', { name: 'محامي' });
        await LawyerDB.getUserProfile('u1');
        expect(kvSet).toHaveBeenCalledWith('user:u1:profile', { name: 'محامي' });
        expect(kvGet).toHaveBeenCalledWith('user:u1:profile');
    });

    it('يمرّر قضايا العمل إلى KV عند تفعيل سلة الملفات', async () => {
        isLiveCloudSyncBucketEnabled.mockImplementation((bucket: string) => bucket === 'files');
        kvSet.mockResolvedValue(undefined);
        await LawyerDB.saveCase('u1', { id: 'c1', title: 'دعوى' });
        expect(kvSet).toHaveBeenCalledWith(
            'user:u1:cases:c1',
            expect.objectContaining({ id: 'c1', title: 'دعوى' }),
        );
    });

    it('لا يمرّر الملاحظات إلى KV عندما سلة الملاحظات مطفأة حتى لو المواعيد سحابية', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        isLiveCloudSyncBucketEnabled.mockImplementation((bucket: string) => bucket === 'files');
        kvSet.mockResolvedValue(undefined);
        await LawyerDB.saveNote('u1', { id: 'n1', text: 'ملاحظة' });
        expect(kvSet).not.toHaveBeenCalled();
    });
});
