import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadAdminMock = vi.fn();

vi.mock('@/app/services/forum/loadForumSupabaseAdmin', () => ({
    loadForumSupabaseAdmin: () => loadAdminMock(),
}));

vi.mock('@/app/api/upload/uploadStorageUtils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/upload/uploadStorageUtils')>();
    return {
        ...actual,
        resolveUploadBucket: () => 'legal-docs',
    };
});

const {
    isForumRepositorySweepablePath,
    repositoryPrefixOrphanPaths,
    removeForumRepositoryStorageOrEnqueue,
    sweepForumRepositoryOrphansForUser,
} = await import('@/app/services/forum/forumRepositoryOrphanSweep');

describe('مسارات اليتيم', () => {
    it('يرفض المرجع العام والمسار المحلي', () => {
        expect(isForumRepositorySweepablePath('u1', 'forum-repo:11111111-1111-4111-8111-111111111111')).toBe(
            false,
        );
        expect(isForumRepositorySweepablePath('u1', 'idb:forum:x')).toBe(false);
        expect(isForumRepositorySweepablePath('u1', 'u1/repository/a.pdf')).toBe(true);
        expect(isForumRepositorySweepablePath('u1', 'other/repository/a.pdf')).toBe(false);
    });

    it('يتجاوز ملفاً حديثاً غير مفهرس (رفع جارٍ)', () => {
        const now = Date.parse('2026-08-30T12:00:00.000Z');
        const paths = repositoryPrefixOrphanPaths({
            userId: 'u1',
            catalogPaths: [],
            objects: [
                { id: 'obj', name: 'fresh.pdf', created_at: '2026-08-30T11:59:00.000Z' },
            ],
            nowMs: now,
        });
        expect(paths).toEqual([]);
    });

    it('يعدّ ملفاً قديماً خارج الفهرس يتيماً', () => {
        const now = Date.parse('2026-08-30T12:00:00.000Z');
        const paths = repositoryPrefixOrphanPaths({
            userId: 'u1',
            catalogPaths: ['u1/repository/live.pdf'],
            objects: [
                { id: 'a', name: 'live.pdf', created_at: '2026-08-30T00:00:00.000Z' },
                { id: 'b', name: 'old.pdf', created_at: '2026-08-30T00:00:00.000Z' },
                { name: 'folder', id: null, created_at: '2026-08-01T00:00:00.000Z' },
            ],
            nowMs: now,
        });
        expect(paths).toEqual(['u1/repository/old.pdf']);
    });
});

describe('إزالة التخزين أو الطابور', () => {
    it('يطرح في الطابور عندما يرجع remove خطأ', async () => {
        const insert = vi.fn(async () => ({ error: null }));
        const remove = vi.fn(async () => ({ error: { message: 'storage down' } }));
        const admin = {
            from: (table: string) => ({
                insert: (row: unknown) => {
                    expect(table).toBe('forum_repository_orphan_paths');
                    return insert(row);
                },
                delete: () => ({ eq: async () => ({ error: null }) }),
            }),
            storage: { from: () => ({ remove, list: async () => ({ data: [], error: null }) }) },
        };
        await removeForumRepositoryStorageOrEnqueue(
            admin as never,
            'u1',
            'u1/repository/a.pdf',
        );
        expect(remove).toHaveBeenCalledWith(['u1/repository/a.pdf']);
        expect(insert).toHaveBeenCalledWith({
            author_id: 'u1',
            storage_path: 'u1/repository/a.pdf',
        });
    });
});

describe('كنس يتامى المالك', () => {
    beforeEach(() => {
        loadAdminMock.mockReset();
    });

    it('يعيد محاولة مسار الطابور ثم يكنس البادئة', async () => {
        const remove = vi.fn(async () => ({ error: null }));
        const deleted: string[] = [];
        const admin = {
            from: (table: string) => {
                if (table === 'forum_repository_docs') {
                    return {
                        select: () => ({
                            eq: () => ({
                                limit: () =>
                                    Promise.resolve({
                                        data: [{ storage_path: 'u1/repository/live.pdf' }],
                                        error: null,
                                    }),
                            }),
                        }),
                    };
                }
                return {
                    select: () => ({
                        eq: () => ({
                            limit: () =>
                                Promise.resolve({
                                    data: [{ id: 'q1', storage_path: 'u1/repository/queued.pdf' }],
                                    error: null,
                                }),
                        }),
                    }),
                    delete: () => ({
                        eq: (_col: string, value: string) => {
                            deleted.push(value);
                            return Promise.resolve({ error: null });
                        },
                    }),
                    insert: async () => ({ error: null }),
                };
            },
            storage: {
                from: () => ({
                    remove,
                    list: async () => ({
                        data: [
                            {
                                id: 'obj',
                                name: 'stale.pdf',
                                created_at: '2026-08-01T00:00:00.000Z',
                            },
                        ],
                        error: null,
                    }),
                }),
            },
        };
        loadAdminMock.mockResolvedValue(admin);

        await sweepForumRepositoryOrphansForUser('u1', { force: true });

        expect(remove).toHaveBeenCalledWith(['u1/repository/queued.pdf']);
        expect(remove).toHaveBeenCalledWith(['u1/repository/stale.pdf']);
        expect(deleted).toContain('u1/repository/queued.pdf');
        expect(deleted).toContain('u1/repository/stale.pdf');
    });
});
