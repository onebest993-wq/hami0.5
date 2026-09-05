import { afterEach, describe, expect, it } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import {
    peekRepositoryDocsCache,
    resetRepositoryDocsCacheForTests,
    setRepositoryDocsCache,
} from '@/app/services/forum/repositoryDocsWarmCache';
import {
    mergeRepositoryDocumentsById,
    normalizeRepositoryRows,
    resolveInitialRepositoryDocuments,
} from '../legalRepositoryNormalize';

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

describe('mergeRepositoryDocumentsById', () => {
    it('لا يمحو تعديلاً محلياً بنسخة خادم من اليوم نفسه', () => {
        const local = doc({
            id: 'd1',
            title: 'العنوان المعدَّل',
            uploadDate: '2026-08-30',
            updatedAt: '2026-08-30T12:00:00.000Z',
        });
        const remote = doc({
            id: 'd1',
            title: 'العنوان القديم',
            uploadDate: '2026-08-30',
            updatedAt: '2026-08-30T09:00:00.000Z',
        });
        expect(mergeRepositoryDocumentsById([local], [remote])[0]?.title).toBe('العنوان المعدَّل');
    });

    it('التعادل بلا updatedAt يرجّح المحلي', () => {
        const local = doc({ id: 'd1', title: 'محلي', uploadDate: '2026-08-30' });
        const remote = doc({ id: 'd1', title: 'خادم', uploadDate: '2026-08-30' });
        expect(mergeRepositoryDocumentsById([local], [remote])[0]?.title).toBe('محلي');
    });

    it('يأخذ نسخة الخادم عندما تكون أحدث فعلاً', () => {
        const local = doc({
            id: 'd1',
            title: 'محلي قديم',
            uploadDate: '2026-08-30',
            updatedAt: '2026-08-30T08:00:00.000Z',
        });
        const remote = doc({
            id: 'd1',
            title: 'خادم أحدث',
            uploadDate: '2026-08-30',
            updatedAt: '2026-08-30T20:00:00.000Z',
        });
        expect(mergeRepositoryDocumentsById([local], [remote])[0]?.title).toBe('خادم أحدث');
    });

    it('يضم مستندات المحامين الآخرين غير الموجودة محلياً', () => {
        const local = doc({ id: 'mine', title: 'لي' });
        const remote = doc({ id: 'theirs', title: 'لغيري', authorId: 'u2' });
        const merged = mergeRepositoryDocumentsById([local], [remote]);
        expect(merged.map((d) => d.id).sort()).toEqual(['mine', 'theirs']);
    });
});
