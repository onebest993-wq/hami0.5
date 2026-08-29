import { afterEach, describe, expect, it } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import {
    peekRepositoryDocsCache,
    resetRepositoryDocsCacheForTests,
    setRepositoryDocsCache,
} from '@/app/services/forum/repositoryDocsWarmCache';
import { normalizeRepositoryRows, resolveInitialRepositoryDocuments } from '../legalRepositoryNormalize';

function doc(partial: Partial<RepositoryDocument> & Pick<RepositoryDocument, 'id' | 'title'>): RepositoryDocument {
    return {
        description: '',
        type: 'عقد',
        authorId: 'u1',
        authorName: 'محامي',
        uploadDate: '2026-01-01',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: 'p',
        fileSize: 1,
        tags: [],
        ...partial,
    };
}

describe('legalRepositoryNormalize', () => {
    afterEach(() => {
        resetRepositoryDocsCacheForTests();
        localStorage.removeItem('hami:repository:docs:v1');
    });

    it('يستنتج الوسوم من العنوان والوصف', () => {
        const rows = normalizeRepositoryRows([
            doc({ id: '1', title: 'عقد شركات', description: 'اتفاق بين شريكين', tags: [] }),
        ]);
        expect(rows[0].tags).toEqual(expect.arrayContaining(['#شركات']));
    });

    it('resolveInitial يفضّل كاش التسخين', () => {
        setRepositoryDocsCache([doc({ id: 'cached', title: 'من الكاش' })]);
        const initial = resolveInitialRepositoryDocuments();
        expect(initial[0]?.id).toBe('cached');
        expect(peekRepositoryDocsCache()?.[0]?.id).toBe('cached');
    });
});
