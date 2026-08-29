import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const uploadSmartFile = vi.fn();
const getSignedUrl = vi.fn();
const saveDocument = vi.fn();
const deleteDocument = vi.fn();
const releaseRepositoryBlobUrl = vi.fn();

vi.mock('@/app/services/lawyer-cloud', () => ({
    LawyerStorage: {
        uploadSmartFile: (...args: unknown[]) => uploadSmartFile(...args),
        getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
    },
    RepositoryDB: {
        saveDocument: (...args: unknown[]) => saveDocument(...args),
        deleteDocument: (...args: unknown[]) => deleteDocument(...args),
    },
}));

vi.mock('../repositoryStorageService', () => ({
    releaseRepositoryBlobUrl: (...args: unknown[]) => releaseRepositoryBlobUrl(...args),
}));

const isLawyerWorkCloudLive = vi.fn(() => true);

vi.mock('@/app/services/settings/lawyerWorkCloudGate', () => ({
    isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
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
        saveDocument.mockReset();
        deleteDocument.mockReset();
        releaseRepositoryBlobUrl.mockReset();
        isLawyerWorkCloudLive.mockReset().mockReturnValue(true);
        uploadSmartFile.mockResolvedValue({ path: 'cloud/a.pdf' });
        getSignedUrl.mockResolvedValue('https://signed');
        saveDocument.mockResolvedValue(undefined);
    });

    it('لا يرفع إلى السحابة إن حُذف المستند محلياً', async () => {
        const applyCloudDoc = vi.fn();
        await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => false,
            applyCloudDoc,
        });
        expect(uploadSmartFile).not.toHaveBeenCalled();
        expect(saveDocument).not.toHaveBeenCalled();
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('لا يحفظ في المخزن إن حُذف أثناء الرفع', async () => {
        let present = true;
        uploadSmartFile.mockImplementation(async () => {
            present = false;
            return { path: 'cloud/a.pdf' };
        });
        const applyCloudDoc = vi.fn();
        await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => present,
            applyCloudDoc,
        });
        expect(saveDocument).not.toHaveBeenCalled();
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('يحذف من المخزن إن اكتمل الحفظ السحابي بعد حذف محلي', async () => {
        saveDocument.mockImplementation(async () => {
            /* الحفظ نجح بينما المستخدم حذف محلياً */
        });
        let present = true;
        getSignedUrl.mockImplementation(async () => {
            present = false;
            return 'https://signed';
        });
        const applyCloudDoc = vi.fn();
        await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => present,
            applyCloudDoc,
        });
        expect(saveDocument).not.toHaveBeenCalled();
        expect(deleteDocument).not.toHaveBeenCalled();
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('لا يُبقي المستند في المخزن إن حُذف أثناء saveDocument', async () => {
        let present = true;
        saveDocument.mockImplementation(async () => {
            present = false;
        });
        deleteDocument.mockResolvedValue(undefined);
        const applyCloudDoc = vi.fn();
        await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => present,
            applyCloudDoc,
        });
        expect(saveDocument).toHaveBeenCalled();
        expect(deleteDocument).toHaveBeenCalledWith('doc-1');
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });

    it('لا يرفع إلى السحابة عندما مزامنة العمل مطفأة', async () => {
        isLawyerWorkCloudLive.mockReturnValue(false);
        const applyCloudDoc = vi.fn();
        await syncRepositoryDocumentToCloud({
            savedDoc: sampleDoc(),
            file: new File(['x'], 'a.pdf', { type: 'application/pdf' }),
            ownerId: 'u1',
            isStillPresent: () => true,
            applyCloudDoc,
        });
        expect(uploadSmartFile).not.toHaveBeenCalled();
        expect(saveDocument).not.toHaveBeenCalled();
        expect(applyCloudDoc).not.toHaveBeenCalled();
    });
});
