import { describe, expect, it } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { filterAndSortRepositoryDocuments } from '../legalRepositoryListQuery';

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

const rows: RepositoryDocument[] = [
    doc({ id: 'a', title: 'عقد بيع', type: 'عقد', uploadDate: '2026-03-01', tags: ['#عقاري'] }),
    doc({
        id: 'b',
        title: 'بحث جزائي',
        type: 'بحث قانوني',
        description: 'دراسة في القانون الجنائي',
        uploadDate: '2026-01-01',
        tags: ['#جنائي'],
    }),
    doc({ id: 'c', title: 'عريضة تنفيذ', type: 'عريضة', uploadDate: '2026-02-01', tags: ['#تنفيذ'] }),
];

describe('filterAndSortRepositoryDocuments', () => {
    it('يصفي حسب النوع', () => {
        const result = filterAndSortRepositoryDocuments(rows, {
            searchTerm: '',
            selectedType: 'عقد',
            selectedTag: null,
            sortBy: 'newest',
        });
        expect(result.map((d) => d.id)).toEqual(['a']);
    });

    it('يبحث في العنوان والوصف والوسوم', () => {
        const byTitle = filterAndSortRepositoryDocuments(rows, {
            searchTerm: 'عريضة',
            selectedType: 'الكل',
            selectedTag: null,
            sortBy: 'newest',
        });
        expect(byTitle.map((d) => d.id)).toEqual(['c']);

        const byDescription = filterAndSortRepositoryDocuments(rows, {
            searchTerm: 'جزائي',
            selectedType: 'الكل',
            selectedTag: null,
            sortBy: 'newest',
        });
        expect(byDescription.map((d) => d.id)).toEqual(['b']);
    });

    it('يصفي حسب وسم التخصص', () => {
        const result = filterAndSortRepositoryDocuments(rows, {
            searchTerm: '',
            selectedType: 'الكل',
            selectedTag: 'عقاري',
            sortBy: 'newest',
        });
        expect(result.map((d) => d.id)).toEqual(['a']);
    });

    it('يرتب بالأحدث والأقدم والاسم', () => {
        const newest = filterAndSortRepositoryDocuments(rows, {
            searchTerm: '',
            selectedType: 'الكل',
            selectedTag: null,
            sortBy: 'newest',
        });
        expect(newest.map((d) => d.id)).toEqual(['a', 'c', 'b']);

        const oldest = filterAndSortRepositoryDocuments(rows, {
            searchTerm: '',
            selectedType: 'الكل',
            selectedTag: null,
            sortBy: 'oldest',
        });
        expect(oldest.map((d) => d.id)).toEqual(['b', 'c', 'a']);

        const byName = filterAndSortRepositoryDocuments(rows, {
            searchTerm: '',
            selectedType: 'الكل',
            selectedTag: null,
            sortBy: 'name',
        });
        expect(byName.map((d) => d.title)).toEqual(
            [...rows.map((d) => d.title)].sort((a, b) => a.localeCompare(b)),
        );
    });
});
