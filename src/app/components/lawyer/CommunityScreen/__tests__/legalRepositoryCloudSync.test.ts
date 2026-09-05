import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const uploadSmartFile = vi.fn();
const getSignedUrl = vi.fn();
const releaseRepositoryBlobUrl = vi.fn();

vi.mock('@/app/services/storage/lawyerStorageRuntime', () => ({
    LawyerStorage: {
        uploadSmartFile: (...args: unknown[]) => uploadSmartFile(...args),
        getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
    },
}));

vi.mock('../repositoryStorageService', () => ({
    releaseRepositoryBlobUrl: (...args: unknown[]) => releaseRepositoryBlobUrl(...args),
    purgeRepositoryLocalFile: (...args: unknown[]) => releaseRepositoryBlobUrl(...args),
}));

import { syncRepositoryDocumentToCloud } from '../legalRepositoryCloudSync';

function sampleDoc(): RepositoryDocument {
    return {
        id: 'doc-1',
        title: 'عقد',
        description: 'وصف',
        type: 'عقد',
        authorId: 'u1',
        authorName: 'محامي',
        uploadDate: '2026-01-01',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:forum:a',
        fileSize: 12,
        tags: [],
    };
}

describe('syncRepositoryDocumentToCloud', () => {
    beforeEach(() => {
        uploadSmartFile.mockReset();
        getSignedUrl.mockReset();
        releaseRepositoryBlobUrl.mockReset();
        uploadSmartFile.mockResolvedValue({ path: 'u1/repository/a.pdf' });
        getSignedUrl.mockResolvedValue('https://signed');
    });

    it('لا يرفع إلى السحابة إن حُذف المستند محلياً', async () => {
        const applyCloudDoc = vi.fn();
        await expect(
            syncRepositoryDocumentToCloud({
                savedDoc: sampleDoc(),
                file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
                ownerId: 'u1',
                isStillPresent: () => false,
                applyCloudDoc,
            }),
        ).rejects.toThrow('cloud-aborted');
        expect(uploadSmartFile).not.toHaveBeenCalled();
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('لا يطبّق المسار السحابي إن حُذف أثناء الرفع', async () => {
        let present = true;
        uploadSmartFile.mockImplementation(async () => {
            present = false;
            return { path: 'u1/repository/a.pdf' };
        });
        const applyCloudDoc = vi.fn();
        await expect(
            syncRepositoryDocumentToCloud({
                savedDoc: sampleDoc(),
                file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
                ownerId: 'u1',
                isStillPresent: () => present,
                applyCloudDoc,
            }),
        ).rejects.toThrow('cloud-aborted');
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('يرفع إلى السحابة ويعيد مسار المخزن', async () => {
        const applyCloudDoc = vi.fn();
        const cloud = await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => true,
            applyCloudDoc,
        });
        expect(uploadSmartFile).toHaveBeenCalledWith('u1', expect.any(File), 'repository');
        expect(cloud.storagePath).toBe('u1/repository/a.pdf');
        expect(applyCloudDoc).toHaveBeenCalled();
        expect(releaseRepositoryBlobUrl).toHaveBeenCalledWith('idb:forum:a');
    });

    it('يفشل إن تعذّر مسار المخزن', async () => {
        uploadSmartFile.mockResolvedValueOnce({});
        await expect(
            syncRepositoryDocumentToCloud({
                savedDoc: sampleDoc(),
                file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
                ownerId: 'u1',
                isStillPresent: () => true,
                applyCloudDoc: vi.fn(),
            }),
        ).rejects.toThrow('cloud-failed');
    });
});
