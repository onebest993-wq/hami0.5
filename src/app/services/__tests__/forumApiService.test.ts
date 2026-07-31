import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: { id: 'session-user' } })),
}));

const forumGroupLocalMocks = {
    listGroups: vi.fn(),
};

vi.mock('@/app/services/forum/forumGroupLocalStore', () => ({
    ForumGroupLocalStore: {
        listGroups: (...args: unknown[]) => forumGroupLocalMocks.listGroups(...args),
    },
}));

// محاكاة SecureAPIClient + SecureFetchError مباشرة (يسمح باختبار استراتيجية الـ fallback)
vi.mock('@/app/services/SecureAPIClient', () => {
    class SecureFetchError extends Error {
        status: number;
        bodyText: string;
        url: string;
        constructor(message: string, status: number, bodyText = '', url = '') {
            super(message);
            this.name = 'SecureFetchError';
            this.status = status;
            this.bodyText = bodyText;
            this.url = url;
        }
    }
    return {
        SecureFetchError,
        getCurrentAccessToken: vi.fn().mockResolvedValue('test-access-token'),
        SecureAPIClient: {
            fetchSecure: vi.fn(),
        },
    };
});

// محاكاة supabase auth (يحتاجه getSessionUserId)
vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({
                data: {
                    session: {
                        user: { id: 'session-user' },
                        access_token: 'test-access-token',
                    },
                },
            }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
    },
}));

vi.mock('@/app/services/auditLogPublisher', () => ({
    AuditLog: {
        forum: {
            questionPosted: vi.fn(),
        },
    },
}));

const prepareForumAttachmentForPublish = vi.fn();

vi.mock('@/app/services/forumAttachmentService', () => ({
    prepareForumAttachmentForPublish: (...args: unknown[]) =>
        prepareForumAttachmentForPublish(...args),
}));

// محاكاة lawyer-cloud (مسار fallback)
const lawyerCloudMocks = {
    listPosts: vi.fn(),
    savePost: vi.fn(),
    persistPostsBatch: vi.fn(),
    addCommunityPost: vi.fn(),
    deleteCommunityPost: vi.fn(),
    addCommunityComment: vi.fn(),
    deleteCommunityComment: vi.fn(),
    editCommunityComment: vi.fn(),
    reportCommunityPost: vi.fn(),
    togglePinCommunityPost: vi.fn(),
    updateCommunityPost: vi.fn(),
    isBanned: vi.fn(),
};

vi.mock('@/app/services/lawyer-cloud', () => ({
    CommunityDB: {
        listPosts: lawyerCloudMocks.listPosts,
        savePost: lawyerCloudMocks.savePost,
        persistPostsBatch: lawyerCloudMocks.persistPostsBatch,
    },
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    CommunityDB: {
        listPosts: lawyerCloudMocks.listPosts,
        savePost: lawyerCloudMocks.savePost,
        persistPostsBatch: lawyerCloudMocks.persistPostsBatch,
    },
    mergeCommunityPostsById: (local: CommunityPost[], remote: CommunityPost[]) => {
        const map = new Map<string, CommunityPost>();
        for (const p of local) map.set(p.id, p);
        for (const p of remote) {
            const prev = map.get(p.id);
            if (!prev) {
                map.set(p.id, p);
                continue;
            }
            const prevTime = Date.parse(prev.updatedAt);
            const nextTime = Date.parse(p.updatedAt);
            map.set(p.id, nextTime >= prevTime ? p : prev);
        }
        return Array.from(map.values());
    },
    filterDeletedCommunityPosts: (posts: CommunityPost[], _deleted: Set<string>) => posts,
    getDeletedCommunityPostIds: vi.fn().mockResolvedValue(new Set<string>()),
    sortCommunityPosts: (posts: CommunityPost[]) => posts,
    addCommunityPost: lawyerCloudMocks.addCommunityPost,
    deleteCommunityPost: lawyerCloudMocks.deleteCommunityPost,
    addCommunityComment: lawyerCloudMocks.addCommunityComment,
    deleteCommunityComment: lawyerCloudMocks.deleteCommunityComment,
    editCommunityComment: lawyerCloudMocks.editCommunityComment,
    reportCommunityPost: lawyerCloudMocks.reportCommunityPost,
    togglePinCommunityPost: lawyerCloudMocks.togglePinCommunityPost,
    updateCommunityPost: lawyerCloudMocks.updateCommunityPost,
    BanDB: { isBanned: lawyerCloudMocks.isBanned },
}));

const makePost = (id: string, overrides: Partial<CommunityPost> = {}): CommunityPost => ({
    id,
    authorId: 'author-1',
    authorName: 'محامي',
    content: 'محتوى',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    attachment: null,
    upvoterIds: [],
    comments: [],
    bestCommentId: null,
    ...overrides,
});

let ForumApiService: typeof import('../forumApiService').ForumApiService;
let SecureAPIClient: typeof import('../SecureAPIClient').SecureAPIClient;
let getCurrentAccessToken: ReturnType<typeof vi.fn>;
let SecureFetchError: typeof import('../SecureAPIClient').SecureFetchError;
let supabaseModule: typeof import('@/app/lib/supabase-client');
let readPersistedSupabaseAuth: ReturnType<typeof vi.fn>;

beforeEach(async () => {
    // إعادة استيراد + إعادة بناء التطبيقات بدل clearAllMocks (الذي يمسح الـ implementations)
    const apiModule = await import('../forumApiService');
    const secModule = await import('../SecureAPIClient');
    supabaseModule = await import('@/app/lib/supabase-client');
    const authStorageModule = await import('@/app/utils/authStorage');
    readPersistedSupabaseAuth = authStorageModule.readPersistedSupabaseAuth as ReturnType<typeof vi.fn>;
    ForumApiService = apiModule.ForumApiService;
    SecureAPIClient = secModule.SecureAPIClient;
    getCurrentAccessToken = secModule.getCurrentAccessToken as ReturnType<typeof vi.fn>;
    SecureFetchError = secModule.SecureFetchError;
    // إعادة تهيئة mocks
    (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockReset();
    getCurrentAccessToken.mockReset();
    getCurrentAccessToken.mockResolvedValue('test-access-token');
    for (const fn of Object.values(lawyerCloudMocks)) fn.mockReset();
    (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockReset();
    (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
            session: {
                user: { id: 'session-user' },
                access_token: 'test-access-token',
            },
        },
    });
    (supabaseModule.supabase.auth.getUser as ReturnType<typeof vi.fn>).mockReset();
    (supabaseModule.supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { user: null } });
    forumGroupLocalMocks.listGroups.mockReset();
    forumGroupLocalMocks.listGroups.mockReturnValue([]);
    readPersistedSupabaseAuth.mockReset();
    readPersistedSupabaseAuth.mockReturnValue({ user: { id: 'session-user' } });
    lawyerCloudMocks.savePost.mockResolvedValue(undefined);
    prepareForumAttachmentForPublish.mockReset();
    prepareForumAttachmentForPublish.mockImplementation(async (attachment: unknown) => attachment);
});

afterEach(() => {
    // لا نُعيد كل الأشياء كي يبقى vi.mock فعّالاً عبر الاختبارات
});

describe('ForumApiService.withFallback', () => {
    describe('listPostsPaginated', () => {
        it('يستخدم API عند نجاح الاستدعاء ويدمج مع المحلي', async () => {
            const apiPosts = [makePost('p1'), makePost('p2')];
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                posts: apiPosts,
                total: 2,
            });
            const res = await ForumApiService.listPostsPaginated(20, 0);
            expect(res.posts).toHaveLength(2);
            expect(res.total).toBe(2);
            expect(SecureAPIClient.fetchSecure).toHaveBeenCalledWith(
                expect.stringContaining('limit=20'),
                { method: 'GET' },
            );
            expect(lawyerCloudMocks.listPosts).toHaveBeenCalled();
        });

        it('يستخدم fallback عند فشل عام (شبكة/500)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('legacy-1')]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
            const res = await ForumApiService.listPostsPaginated(10, 0);
            expect(res.posts[0]?.id).toBe('legacy-1');
            expect(lawyerCloudMocks.listPosts).toHaveBeenCalled();
        });

        it('يستخدم fallback المحلي عند 401 (جلسة منتهية)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('local-401')]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('unauthorized', 401, '', '/api/forum/posts'),
            );
            const res = await ForumApiService.listPostsPaginated(10, 0);
            expect(res.posts[0]?.id).toBe('local-401');
            expect(lawyerCloudMocks.listPosts).toHaveBeenCalled();
        });

        it('يتخطى API عند غياب access token ويستخدم المحلي', async () => {
            getCurrentAccessToken.mockResolvedValueOnce(null);
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('offline-local')]);
            const res = await ForumApiService.listPostsPaginated(10, 0);
            expect(res.posts[0]?.id).toBe('offline-local');
            expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
        });

        it('يرمي الخطأ مباشرة عند 403 (banned)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('local-only')]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, JSON.stringify({ error: 'حسابك محظور من المنتدى' }), '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('forbidden');
        });

        it('يرمي الخطأ عند 403 توقيع WIFE (لا fallback للقراءة)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('local-only')]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, JSON.stringify({ error: 'Cryptographic verification failed' }), '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('forbidden');
        });
    });

    describe('listGroups', () => {
        const sampleGroup = {
            id: 'g1',
            name: 'مجموعة تجريبية',
            description: 'وصف',
            coverImage: null,
            creatorId: 'session-user',
            isOfficial: false,
            createdAt: '2026-01-01T00:00:00.000Z',
            memberCount: 1,
            isMember: true,
            viewerRole: 'admin' as const,
        };

        it('يستخدم API عند نجاح الاستدعاء', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                groups: [sampleGroup],
            });
            const rows = await ForumApiService.listGroups();
            expect(rows).toHaveLength(1);
            expect(rows[0]?.id).toBe('g1');
            expect(SecureAPIClient.fetchSecure).toHaveBeenCalledWith('/api/forum/groups', { method: 'GET' });
        });

        it('يقع على المخزن المحلي عند فشل الشبكة', async () => {
            forumGroupLocalMocks.listGroups.mockReturnValueOnce([sampleGroup]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
            const rows = await ForumApiService.listGroups();
            expect(rows[0]?.id).toBe('g1');
            expect(forumGroupLocalMocks.listGroups).toHaveBeenCalled();
        });

        it('يقع على المخزن المحلي عند 401', async () => {
            forumGroupLocalMocks.listGroups.mockReturnValueOnce([sampleGroup]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('unauthorized', 401, '', '/api/forum/groups'),
            );
            const rows = await ForumApiService.listGroups();
            expect(rows[0]?.id).toBe('g1');
        });

        it('يتخطى API عند غياب جلسة بعيدة (بدون access_token)', async () => {
            (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { session: { user: { id: 'session-user' } } },
            });
            forumGroupLocalMocks.listGroups.mockReturnValueOnce([sampleGroup]);
            const rows = await ForumApiService.listGroups();
            expect(rows[0]?.id).toBe('g1');
            expect(SecureAPIClient.fetchSecure).not.toHaveBeenCalled();
        });

        it('يرمي الخطأ عند 403', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, JSON.stringify({ error: 'حسابك محظور من المنتدى' }), '/api/forum/groups'),
            );
            await expect(ForumApiService.listGroups()).rejects.toThrow('forbidden');
        });
    });

    describe('createPost', () => {
        it('يحفظ محلياً أولاً ثم يُزامِن مع API', async () => {
            const post = makePost('new-1');
            const savedFromServer = { ...post, isPinned: false };
            lawyerCloudMocks.addCommunityPost.mockResolvedValueOnce(undefined);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                post: savedFromServer,
            });
            const result = await ForumApiService.createPost(post);
            expect(result.id).toBe('new-1');
            expect(lawyerCloudMocks.addCommunityPost).toHaveBeenCalledBefore(
                SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>,
            );
        });

        it('يُرجع المنشور المحلي عند فشل API بعد الحفظ المحلي', async () => {
            const post = makePost('new-2');
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('5xx'));
            lawyerCloudMocks.addCommunityPost.mockResolvedValueOnce(undefined);
            const result = await ForumApiService.createPost(post);
            /* معرّف خادم جديد دائماً — لا يُعاد استخدام id العميل */
            expect(result.id).not.toBe('new-2');
            expect(result.authorId).toBe(post.authorId);
            expect(result.content).toBe(post.content.trim());
            expect(lawyerCloudMocks.addCommunityPost).toHaveBeenCalledTimes(1);
            const saved = lawyerCloudMocks.addCommunityPost.mock.calls[0][0];
            expect(saved.id).toBe(result.id);
            expect(saved.authorId).toBe(post.authorId);
        });

        it('لا يعيد تجهيز المرفق إذا كان لديه storagePath محلي ثابت', async () => {
            const post = makePost('new-3', {
                attachment: {
                    type: 'image',
                    name: 'scan.png',
                    mimeType: 'image/png',
                    storagePath: 'idb:forum:stable-scan',
                },
            });
            const savedFromServer = { ...post };
            lawyerCloudMocks.addCommunityPost.mockResolvedValueOnce(undefined);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                post: savedFromServer,
            });

            const result = await ForumApiService.createPost(post);

            expect(result.attachment).toEqual(post.attachment);
            expect(prepareForumAttachmentForPublish).not.toHaveBeenCalled();
            expect(lawyerCloudMocks.addCommunityPost).toHaveBeenCalledTimes(1);
            const saved = lawyerCloudMocks.addCommunityPost.mock.calls[0][0];
            expect(saved.attachment?.storagePath).toBe('idb:forum:stable-scan');
            expect(saved.attachment?.name).toBe('scan.png');
        });
    });

    describe('reportPost', () => {
        it('يُعيد duplicate=true إذا أبلغ سابقاً', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                result: { ok: false, duplicate: true },
            });
            const r = await ForumApiService.reportPost('post-1', 'سبب');
            expect(r.duplicate).toBe(true);
        });

        it('يستخدم fallback مع reporterId من الجلسة', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('down'));
            lawyerCloudMocks.reportCommunityPost.mockResolvedValueOnce({ ok: true });
            const r = await ForumApiService.reportPost('post-1', 'محتوى مخالف');
            expect(r.ok).toBe(true);
            expect(lawyerCloudMocks.reportCommunityPost).toHaveBeenCalledWith(
                'post-1',
                'محتوى مخالف',
                'session-user',
            );
        });
    });

    describe('isUserBanned', () => {
        it('يستخدم API GET ويعيد flag الحظر', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                banned: true,
            });
            const result = await ForumApiService.isUserBanned('user-1');
            expect(result).toBe(true);
        });

        it('يقع على fallback BanDB عند فشل API', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('5xx'));
            lawyerCloudMocks.isBanned.mockResolvedValueOnce({
                userId: 'user-1',
                userName: 'X',
                reason: 'cause',
                bannedBy: 'admin',
                bannedAt: '2026-01-01T00:00:00.000Z',
            });
            const result = await ForumApiService.isUserBanned('user-1');
            expect(result).toBe(true);
        });
    });

    describe('updatePost', () => {
        it('يحفظ محلياً أولاً ثم يُزامِن مع API', async () => {
            const updated = makePost('p-edit', { content: 'نص محدّث', isEdited: true });
            lawyerCloudMocks.updateCommunityPost.mockResolvedValueOnce(updated);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                post: updated,
            });
            const result = await ForumApiService.updatePost('p-edit', 'نص محدّث');
            expect(result.content).toBe('نص محدّث');
            expect(lawyerCloudMocks.updateCommunityPost).toHaveBeenCalledWith(
                'p-edit',
                'نص محدّث',
                'session-user',
            );
            expect(SecureAPIClient.fetchSecure).toHaveBeenCalled();
        });

        it('يرمي الخطأ عند 403 WIFE بدلاً من fallback', async () => {
            const updated = makePost('p-edit', { content: 'نص محدّث', isEdited: true });
            lawyerCloudMocks.updateCommunityPost.mockResolvedValueOnce(updated);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, JSON.stringify({ error: 'Cryptographic verification failed' }), '/api/forum/update'),
            );
            await expect(ForumApiService.updatePost('p-edit', 'نص محدّث')).rejects.toThrow('forbidden');
        });
    });

    describe('deletePost', () => {
        it('يحذف محلياً حتى بدون جلسة Supabase عند تمرير requesterId', async () => {
            (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { session: null },
            });
            lawyerCloudMocks.deleteCommunityPost.mockResolvedValueOnce(undefined);
            await ForumApiService.deletePost('p1', 'session-user', false, 'session-user');
            expect(lawyerCloudMocks.deleteCommunityPost).toHaveBeenCalledWith(
                'p1',
                'session-user',
                undefined,
                'session-user',
            );
        });

        it('يرمي بدون تسجيل دخول', async () => {
            (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { session: null },
            });
            readPersistedSupabaseAuth.mockReturnValueOnce({ user: null });
            await expect(ForumApiService.deletePost('p1', 'author-1', false)).rejects.toThrow('يجب تسجيل الدخول');
        });
    });
});
