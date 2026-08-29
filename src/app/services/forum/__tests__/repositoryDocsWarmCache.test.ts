import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import SecureStoreService from '@/app/services/SecureStoreService';

const REPOSITORY_LOCAL_KEY = 'hami:repository:docs:v1';

const sampleDoc: RepositoryDocument = {
    id: 'doc-1',
    title: 'عقد',
    description: 'وصف',
    type: 'عقد',
    authorId: 'u1',
    authorName: 'محامي',
    uploadDate: '2026-01-01',
    fileName: 'contract.pdf',
    mimeType: 'application/pdf',
    storagePath: 'idb:forum:doc-1',
    fileSize: 128,
};

describe('repositoryDocsWarmCache', () => {
    afterEach(() => {
        localStorage.removeItem(REPOSITORY_LOCAL_KEY);
        SecureStoreService.deleteItemSync(REPOSITORY_LOCAL_KEY);
        vi.resetModules();
    });

    it('seeds warm cache from localStorage mirror without async fetch', async () => {
        localStorage.setItem(REPOSITORY_LOCAL_KEY, JSON.stringify([sampleDoc]));

        const { warmRepositoryDocsCache, peekRepositoryDocsCache, resetRepositoryDocsCacheForTests } =
            await import('@/app/services/forum/repositoryDocsWarmCache');

        resetRepositoryDocsCacheForTests();
        warmRepositoryDocsCache();

        expect(peekRepositoryDocsCache()).toEqual([sampleDoc]);
    });

    it('listRepositoryDocumentsSync reads mirror immediately', async () => {
        localStorage.setItem(REPOSITORY_LOCAL_KEY, JSON.stringify([sampleDoc]));

        const { listRepositoryDocumentsSync } = await import('@/app/services/lawyer-cloud');
        expect(listRepositoryDocumentsSync()).toEqual([sampleDoc]);
        expect(localStorage.getItem(REPOSITORY_LOCAL_KEY)).toBeNull();
    });
});
