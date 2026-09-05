import { beforeEach, describe, expect, it, vi } from 'vitest';

type QueryCall = { fn: string; args: unknown[] };

const loadAdminMock = vi.fn();

vi.mock('@/app/services/forum/loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: () => loadAdminMock(),
}));

const {
    searchForumRepositoryDocsOnServer,
    signForumRepositoryDocPath,
    updateForumRepositoryDocOnServer,
    listForumRepositoryDocsOnServer,
    deleteForumRepositoryDocOnServer,
} = await import('@/app/services/forum/forumRepositoryDocs');

/** بنّاء استعلام يسجّل النداءات ويعيد نتيجة مُهيّأة عند await. */
function makeQuery(calls: QueryCall[], result: { data: unknown; error: { message: string } | null; count?: number }) {
    const query: Record<string, unknown> = {};
    for (const fn of [
        'select',
        'order',
        'limit',
        'contains',
        'or',
        'ilike',
        'eq',
        'update',
        'delete',
        'insert',
        'maybeSingle',
    ]) {
        query[fn] = (...args: unknown[]) => {
            calls.push({ fn, args });
            if (fn === 'insert') return Promise.resolve(result);
            return query;
        };
    }
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return query;
}

function makeAdmin(results: Array<{ data: unknown; error: { message: string } | null; count?: number }>) {
    const calls: QueryCall[] = [];
    let attempt = 0;
    const remove = vi.fn(async () => ({ error: null }));
    return {
        calls,
        remove,
        admin: {
            from: () => makeQuery(calls, results[Math.min(attempt++, results.length - 1)]!),
            storage: {
                from: () => ({
                    createSignedUrl: async () => ({ data: { signedUrl: 'https://cdn/signed' } }),
                    remove,
                }),
            },
        },
    };
}

const FILTERS = { q: 'قضية', hasPdf: false, hasImage: false, tag: null, limit: 20 };

describe('بحث المستودع على الخادم', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يبحث في العمود المطبّع لا في العنوان الخام', async () => {
        const { admin, calls } = makeAdmin([{ data: [], error: null }]);
        loadAdminMock.mockResolvedValue(admin);

        await searchForumRepositoryDocsOnServer(FILTERS, 'viewer', false);

        const ilike = calls.find((c) => c.fn === 'ilike');
        expect(ilike?.args[0]).toBe('search_text');
        expect(ilike?.args[1]).toBe('%قضيه%');
        expect(calls.some((c) => c.fn === 'or')).toBe(false);
    });

    it('يسقط إلى الأعمدة الخام إذا لم تُطبَّق الهجرة بعد', async () => {
        const { admin, calls } = makeAdmin([
            { data: null, error: { message: 'column forum_repository_docs.search_text does not exist' } },
            { data: [], error: null },
        ]);
        loadAdminMock.mockResolvedValue(admin);

        await searchForumRepositoryDocsOnServer(FILTERS, 'viewer', false);

        const or = calls.find((c) => c.fn === 'or');
        expect(String(or?.args[0])).toContain('title.ilike');
        expect(String(or?.args[0])).toContain('قضية');
    });
});

describe('توقيع مستندات المكتبة المشتركة', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يوقّع مسار مستند مفهرس ولو كان لمحامٍ آخر', async () => {
        const { admin } = makeAdmin([{ data: [{ storage_path: 'other-user/repository/a.pdf' }], error: null }]);
        loadAdminMock.mockResolvedValue(admin);

        await expect(signForumRepositoryDocPath('other-user/repository/a.pdf')).resolves.toBe(
            'https://cdn/signed',
        );
    });

    it('يرفض مساراً غير مفهرس', async () => {
        const { admin } = makeAdmin([{ data: [], error: null }]);
        loadAdminMock.mockResolvedValue(admin);

        await expect(signForumRepositoryDocPath('other-user/repository/ghost.pdf')).resolves.toBeNull();
    });

    it('يرفض المسار المحلي', async () => {
        loadAdminMock.mockResolvedValue(makeAdmin([{ data: [], error: null }]).admin);
        await expect(signForumRepositoryDocPath('idb:forum:abc')).resolves.toBeNull();
    });
});

describe('تحديث مستند المستودع', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يقيّد التحديث بالمالك لغير المشرف', async () => {
        const { admin, calls } = makeAdmin([
            {
                data: [
                    {
                        id: 'd1',
                        author_id: 'u1',
                        author_name: 'محامي',
                        title: 'جديد',
                        description: 'وصف',
                        doc_type: 'عقد',
                        tags: [],
                        file_name: 'a.pdf',
                        mime_type: 'application/pdf',
                        storage_path: 'u1/repository/a.pdf',
                        file_size: 10,
                        created_at: '2026-08-30T00:00:00.000Z',
                        updated_at: '2026-08-30T10:00:00.000Z',
                    },
                ],
                error: null,
            },
        ]);
        loadAdminMock.mockResolvedValue(admin);

        const patch = {
            title: 'جديد',
            description: 'وصف',
            doc_type: 'عقد' as const,
            tags: [],
            updated_at: '2026-08-30T10:00:00.000Z',
        };
        const saved = await updateForumRepositoryDocOnServer('d1', patch, 'u1', false);

        expect(saved?.updatedAt).toBe('2026-08-30T10:00:00.000Z');
        expect(calls.filter((c) => c.fn === 'eq').map((c) => c.args[0])).toEqual(['id', 'author_id']);
    });

    it('يرفض تحديث مستند لا يخصّ الطالب', async () => {
        const { admin } = makeAdmin([{ data: [], error: null }]);
        loadAdminMock.mockResolvedValue(admin);

        await expect(
            updateForumRepositoryDocOnServer(
                'd1',
                {
                    title: 'جديد',
                    description: 'وصف',
                    doc_type: 'عقد',
                    tags: [],
                    updated_at: '2026-08-30T10:00:00.000Z',
                },
                'intruder',
                false,
            ),
        ).rejects.toThrow('المستند غير موجود أو لا يخصّك');
    });
});

const SAMPLE_ROW = {
    id: '11111111-1111-4111-8111-111111111111',
    author_id: 'author-9',
    author_name: 'محامي',
    title: 'عقد',
    description: 'وصف طويل',
    doc_type: 'عقد' as const,
    tags: [],
    file_name: 'a.pdf',
    mime_type: 'application/pdf',
    storage_path: 'author-9/repository/a.pdf',
    file_size: 10,
    created_at: '2026-08-30T00:00:00.000Z',
    updated_at: '2026-08-30T10:00:00.000Z',
};

describe('إخفاء هوية الناشر', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يخفي authorId ومسار التخزين عن غير المالك', async () => {
        const { admin } = makeAdmin([{ data: [SAMPLE_ROW], error: null }]);
        loadAdminMock.mockResolvedValue(admin);
        const docs = await listForumRepositoryDocsOnServer(20, 'viewer-1', false);
        expect(docs[0]?.authorId).toBe('');
        expect(docs[0]?.authorName).toBe('محامي');
        expect(docs[0]?.storagePath).toBe('forum-repo:11111111-1111-4111-8111-111111111111');
    });

    it('يبقي المعرّف والمسار للمالك', async () => {
        const { admin } = makeAdmin([{ data: [SAMPLE_ROW], error: null }]);
        loadAdminMock.mockResolvedValue(admin);
        const docs = await listForumRepositoryDocsOnServer(20, 'author-9', false);
        expect(docs[0]?.authorId).toBe('author-9');
        expect(docs[0]?.storagePath).toBe('author-9/repository/a.pdf');
    });
});

describe('فلترة PDF في SQL', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يصفّي media_kind قبل الحدّ', async () => {
        const { admin, calls } = makeAdmin([{ data: [], error: null }]);
        loadAdminMock.mockResolvedValue(admin);
        await searchForumRepositoryDocsOnServer(
            { q: '', hasPdf: true, hasImage: false, tag: null, limit: 20 },
            'viewer',
            false,
        );
        expect(calls.some((c) => c.fn === 'eq' && c.args[0] === 'media_kind' && c.args[1] === 'pdf')).toBe(
            true,
        );
    });
});

describe('توقيع مرجع المكتبة المشتركة', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يوقّع forum-repo:id دون كشف مسار المالك', async () => {
        const { admin } = makeAdmin([{ data: [{ storage_path: 'author-9/repository/a.pdf' }], error: null }]);
        loadAdminMock.mockResolvedValue(admin);
        await expect(
            signForumRepositoryDocPath('forum-repo:11111111-1111-4111-8111-111111111111'),
        ).resolves.toBe('https://cdn/signed');
    });
});

describe('حذف المستند من الفهرس والتخزين', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يرفض حذف مستند الغير', async () => {
        const { admin, remove } = makeAdmin([
            { data: { id: 'd1', author_id: 'owner', storage_path: 'owner/repository/a.pdf' }, error: null },
        ]);
        loadAdminMock.mockResolvedValue(admin);
        await expect(deleteForumRepositoryDocOnServer('d1', 'intruder', false)).rejects.toThrow(
            'المستند غير موجود أو لا يخصّك',
        );
        expect(remove).not.toHaveBeenCalled();
    });

    it('يحذف الصف ثم ملف التخزين إن لم يبق مرجع', async () => {
        const { admin, remove } = makeAdmin([
            { data: { id: 'd1', author_id: 'u1', storage_path: 'u1/repository/a.pdf' }, error: null },
            { data: null, error: null },
            { data: [], error: null, count: 0 },
        ]);
        loadAdminMock.mockResolvedValue(admin);
        await deleteForumRepositoryDocOnServer('d1', 'u1', false);
        expect(remove).toHaveBeenCalledWith(['u1/repository/a.pdf']);
    });

    it('يطرح المسار في طابور اليتيم إن فشل Storage.remove', async () => {
        const { admin, remove, calls } = makeAdmin([
            { data: { id: 'd1', author_id: 'u1', storage_path: 'u1/repository/a.pdf' }, error: null },
            { data: null, error: null },
            { data: [], error: null, count: 0 },
            { data: null, error: null },
        ]);
        remove.mockResolvedValueOnce({ error: { message: 'storage down' } });
        loadAdminMock.mockResolvedValue(admin);
        await deleteForumRepositoryDocOnServer('d1', 'u1', false);
        expect(remove).toHaveBeenCalledWith(['u1/repository/a.pdf']);
        const inserted = calls.find((c) => c.fn === 'insert');
        expect(inserted?.args[0]).toEqual(
            expect.objectContaining({ author_id: 'u1', storage_path: 'u1/repository/a.pdf' }),
        );
    });
});
