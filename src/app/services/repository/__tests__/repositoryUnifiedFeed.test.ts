import { describe, expect, it } from 'vitest';
import {
    buildRepositoryFeed,
    filterRepositoryFeed,
    resolveRepositoryEntryLayout,
    searchRepositoryFeed,
} from '@/app/services/repository/repositoryUnifiedFeed';

describe('repositoryUnifiedFeed', () => {
    it('يفلتر المسودات والملفات وملاحظات الأضابير', () => {
        const items = buildRepositoryFeed({
            globalNotes: [
                {
                    id: 'n1',
                    title: 'مسودة',
                    body: 'نص',
                    isPinned: false,
                    type: 'rich',
                },
                {
                    id: 'n2',
                    title: 'مع مرفق',
                    body: 'نص',
                    isPinned: false,
                    attachmentDocId: 'doc-1',
                },
            ],
            lawsuitFiles: [
                {
                    id: 1,
                    notes: [{ id: 9, text: 'ملاحظة', meta: 'عنوان', stageCtx: 'عام', date: '2026-01-01' }],
                } as never,
            ],
            executionFiles: [],
            vaultDocs: [
                {
                    id: 'doc-1',
                    title: 'صورة',
                    type: 'image',
                    authorId: 'u1',
                    createdAt: '2026-01-02',
                    updatedAt: '2026-01-02',
                } as never,
                {
                    id: 'doc-2',
                    title: 'pdf',
                    type: 'pdf',
                    authorId: 'u1',
                    createdAt: '2026-01-03',
                    updatedAt: '2026-01-03',
                } as never,
            ],
        });

        expect(filterRepositoryFeed(items, 'drafts')).toHaveLength(1);
        expect(filterRepositoryFeed(items, 'media')).toHaveLength(2);
        expect(filterRepositoryFeed(items, 'dossier')).toHaveLength(1);
    });

    it('يبحث لحظياً في البطاقات والملفات', () => {
        const items = buildRepositoryFeed({
            globalNotes: [{ id: 'n1', title: 'مسودة خاصة', body: 'نص', isPinned: false }],
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [{ id: 'd1', title: 'عقد PDF', type: 'pdf', authorId: 'u1' } as never],
        });
        expect(searchRepositoryFeed(items, 'خاصة')).toHaveLength(1);
        expect(searchRepositoryFeed(items, 'عقد')).toHaveLength(1);
        expect(searchRepositoryFeed(items, 'xyz')).toHaveLength(0);
    });

    it('يحدد تخطيط البطاقة حسب المحتوى', () => {
        expect(resolveRepositoryEntryLayout('قصير', { signedUrl: 'x', type: 'image' } as never)).toBe('image-dominant');
        expect(
            resolveRepositoryEntryLayout('نص طويل '.repeat(20), { signedUrl: 'x', type: 'image' } as never),
        ).toBe('text-dominant');
    });
});
