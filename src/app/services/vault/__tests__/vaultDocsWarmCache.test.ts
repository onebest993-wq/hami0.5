import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    fetchVaultDocsDeduped,
    invalidateVaultDocsWarmCache,
    peekVaultDocsWarmCache,
    prefetchSmartVaultDocs,
    setVaultDocsWarmCache,
} from '@/app/services/vault/vaultDocsWarmCache';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

const mockListDocs = vi.fn();

vi.mock('@/app/services/vault/smartVaultRuntime', () => ({
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

    it('fetchVaultDocsDeduped يعيد الكاش فوراً مع تحديث خلفي', async () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        const docs = await fetchVaultDocsDeduped('u1');
        expect(docs).toHaveLength(1);
        await new Promise((r) => setTimeout(r, 0));
        expect(mockListDocs).toHaveBeenCalledTimes(1);
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

    it('fetchVaultDocsDeduped يعيد [] عند فشل listDocs دون رفض', async () => {
        mockListDocs.mockRejectedValue(new Error('network'));
        const docs = await fetchVaultDocsDeduped('u1');
        expect(docs).toEqual([]);
        expect(peekVaultDocsWarmCache('u1')).toBeUndefined();
    });

    it('prefetchSmartVaultDocs لا يطلب الشبكة عند وجود كاش', () => {
        setVaultDocsWarmCache('u1', [sampleDoc()]);
        prefetchSmartVaultDocs('u1');
        prefetchSmartVaultDocs('u1');
        expect(mockListDocs).not.toHaveBeenCalled();
    });
});
