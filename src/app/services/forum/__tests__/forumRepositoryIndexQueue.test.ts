import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const listDocuments = vi.fn();
const saveDocument = vi.fn(async (doc: RepositoryDocument) => doc);
const createForumRepositoryDocument = vi.fn();
const updateForumRepositoryDocument = vi.fn();

vi.mock('@/app/services/cloud/lawyerRepositoryCloud', () => ({
    RepositoryDB: {
        listDocuments: () => listDocuments(),
        saveDocument: (doc: RepositoryDocument) => saveDocument(doc),
    },
}));

vi.mock('@/app/services/forum/forumApi/forumApiRepository', () => ({
    createForumRepositoryDocument: (...args: unknown[]) => createForumRepositoryDocument(...args),
    updateForumRepositoryDocument: (...args: unknown[]) => updateForumRepositoryDocument(...args),
}));

const { flushForumRepositoryIndexQueue } = await import('@/app/services/forum/forumRepositoryIndexQueue');

function doc(partial: Partial<RepositoryDocument>): RepositoryDocument {
    return {
        id: 'd1',
        title: 'عقد',
        description: 'وصف',
        type: 'عقد',
        authorId: 'u1',
        authorName: 'محامي',
        uploadDate: '2026-08-30',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
        storagePath: 'u1/repository/a.pdf',
        fileSize: 1,
        ...partial,
    };
}

describe('flushForumRepositoryIndexQueue', () => {
    beforeEach(() => {
        listDocuments.mockReset();
        saveDocument.mockClear();
        createForumRepositoryDocument.mockReset();
        updateForumRepositoryDocument.mockReset();
    });

    it('يعيد فهرسة مستند معلّق ويتخلص من العلامة', async () => {
        listDocuments.mockResolvedValue([doc({ indexSync: 'create' })]);
        createForumRepositoryDocument.mockResolvedValue(doc({ id: 'd1' }));
        const done = await flushForumRepositoryIndexQueue();
        expect(createForumRepositoryDocument).toHaveBeenCalled();
        expect(done[0]?.indexSync).toBeUndefined();
        expect(saveDocument).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', indexSync: undefined }));
    });

    it('يتجاهل المستندات غير المعلّقة', async () => {
        listDocuments.mockResolvedValue([doc({})]);
        await flushForumRepositoryIndexQueue();
        expect(createForumRepositoryDocument).not.toHaveBeenCalled();
        expect(updateForumRepositoryDocument).not.toHaveBeenCalled();
    });
});
