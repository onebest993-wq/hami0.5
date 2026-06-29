import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    fetchVaultDocsDeduped,
    invalidateVaultDocsWarmCache,
    peekVaultDocsWarmCache,
    prefetchSmartVaultDocs,
    setVaultDocsWarmCache,
} from '@/app/services/vault/vaultDocsWarmCache';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

const mockListDocs = vi.fn();

vi.mock('@/app/services/lawyer-cloud', () => ({
    SmartVaultDB: {
        listDocs: (...args: unknown[]) => mockListDocs(...args),
    },
}));

const sampleDoc = (): SmartVaultDoc => ({
    id: 'd1',
    title: 'test',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileSize: 100,
    fileName: 'a.pdf',
    mimeType: 'application/pdf',
    storagePath: 'p',
    signedUrl: null,
    isProcessing: false,
    boundDossierId: null,
});

describe('vaultDocsWarmCache', () => {
    beforeEach(() => {
        invalidateVaultDocsWarmCache();
        mockListDocs.mockReset();
        mockListDocs.mockResolvedValue([sampleDoc()]);
    });

    it('fetchVaultDocsDeduped يعيد الكاش بدون شبكة', async () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        const docs = await fetchVaultDocsDeduped('u1');
        expect(docs).toHaveLength(1);
        expect(mockListDocs).not.toHaveBeenCalled();
    });

    it('fetchVaultDocsDeduped ي dedupe الطلبات المتزامنة', async () => {
        let resolve!: (v: SmartVaultDoc[]) => void;
        mockListDocs.mockReturnValue(
            new Promise<SmartVaultDoc[]>((r) => {
                resolve = r;
            }),
        );

        const p1 = fetchVaultDocsDeduped('u1');
        const p2 = fetchVaultDocsDeduped('u1');
        resolve([sampleDoc()]);
        await Promise.all([p1, p2]);

        expect(mockListDocs).toHaveBeenCalledTimes(1);
        expect(peekVaultDocsWarmCache('u1')).toHaveLength(1);
    });

    it('prefetchSmartVaultDocs لا يطلب الشبكة عند وجود كاش', () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        prefetchSmartVaultDocs('u1');
        prefetchSmartVaultDocs('u1');
        expect(mockListDocs).not.toHaveBeenCalled();
    });
});
