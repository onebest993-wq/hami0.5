import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

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
        SecureAPIClient: {
            fetchSecure: vi.fn(),
        },
    };
});

// محاكاة supabase auth (يحتاجه getSessionUserId)
vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'session-user' } } } }),
            getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
    },
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
    CommunityDB: {
        listPosts: lawyerCloudMocks.listPosts,
        savePost: lawyerCloudMocks.savePost,
        persistPostsBatch: lawyerCloudMocks.persistPostsBatch,
    },
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
let SecureFetchError: typeof import('../SecureAPIClient').SecureFetchError;
let supabaseModule: typeof import('@/app/lib/supabase-client');

beforeEach(async () => {
    // إعادة استيراد + إعادة بناء التطبيقات بدل clearAllMocks (الذي يمسح الـ implementations)
    const apiModule = await import('../forumApiService');
    const secModule = await import('../SecureAPIClient');
    supabaseModule = await import('@/app/lib/supabase-client');
    ForumApiService = apiModule.ForumApiService;
    SecureAPIClient = secModule.SecureAPIClient;
    SecureFetchError = secModule.SecureFetchError;
    // إعادة تهيئة mocks
    (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockReset();
    for (const fn of Object.values(lawyerCloudMocks)) fn.mockReset();
    (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockReset();
    (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: { user: { id: 'session-user' } } },
    });
    (supabaseModule.supabase.auth.getUser as ReturnType<typeof vi.fn>).mockReset();
    (supabaseModule.supabase.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { user: null } });
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

        it('يرمي الخطأ مباشرة عند 401 (لا fallback لأخطاء المصادقة)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('unauthorized', 401, '', '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('unauthorized');
            expect(lawyerCloudMocks.listPosts).toHaveBeenCalled();
        });

        it('يرمي الخطأ مباشرة عند 403 (banned)', async () => {
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('local-only')]);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, JSON.stringify({ error: 'حسابك محظور من المنتدى' }), '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('forbidden');
        });

        it('يستخدم المحلي عند 403 توقيع (غير حظر)', async () => {
            const local = [makePost('local-only')];
            lawyerCloudMocks.listPosts.mockResolvedValueOnce(local);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, '', '/api/forum/posts'),
            );
            const res = await ForumApiService.listPostsPaginated(10, 0);
            expect(res.posts[0]?.id).toBe('local-only');
        });
    });

    describe('createPost', () => {
        it('يستخدم API ويُرجع المنشور المحفوظ', async () => {
            const post = makePost('new-1');
            const savedFromServer = { ...post, isPinned: false };
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                ok: true,
                post: savedFromServer,
            });
            const result = await ForumApiService.createPost(post);
            expect(result.id).toBe('new-1');
        });

        it('يقع على fallback عند فشل API', async () => {
            const post = makePost('new-2');
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('5xx'));
            lawyerCloudMocks.addCommunityPost.mockResolvedValueOnce(undefined);
            const result = await ForumApiService.createPost(post);
            expect(result.id).toBe('new-2');
            expect(lawyerCloudMocks.addCommunityPost).toHaveBeenCalledWith(post);
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

        it('يُرجع النسخة المحلية إذا فشل API', async () => {
            const updated = makePost('p-edit', { content: 'نص محدّث', isEdited: true });
            lawyerCloudMocks.updateCommunityPost.mockResolvedValueOnce(updated);
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, '', '/api/forum/update'),
            );
            const result = await ForumApiService.updatePost('p-edit', 'نص محدّث');
            expect(result.content).toBe('نص محدّث');
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
            await expect(ForumApiService.deletePost('p1', 'author-1', false)).rejects.toThrow('يجب تسجيل الدخول');
        });
    });
});
