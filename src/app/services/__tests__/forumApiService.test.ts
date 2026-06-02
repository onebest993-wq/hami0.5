import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

// محاكاة SecureAPIClient + SecureFetchError مباشرة (يسمح باختبار استراتيجية الـ fallback)
vi.mock('@/app/services/SecureAPIClient', () => {
    class SecureFetchError extends Error {
        status: number;
        constructor(message: string, status: number) {
            super(message);
            this.name = 'SecureFetchError';
            this.status = status;
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
        it('يستخدم API عند نجاح الاستدعاء', async () => {
            const apiPosts = [makePost('p1'), makePost('p2')];
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
            // الـ fallback لم يُستخدم
            expect(lawyerCloudMocks.listPosts).not.toHaveBeenCalled();
        });

        it('يستخدم fallback عند فشل عام (شبكة/500)', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('network'));
            lawyerCloudMocks.listPosts.mockResolvedValueOnce([makePost('legacy-1')]);
            const res = await ForumApiService.listPostsPaginated(10, 0);
            expect(res.posts[0]?.id).toBe('legacy-1');
            expect(lawyerCloudMocks.listPosts).toHaveBeenCalled();
        });

        it('يرمي الخطأ مباشرة عند 401 (لا fallback لأخطاء المصادقة)', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('unauthorized', 401, '', '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('unauthorized');
            expect(lawyerCloudMocks.listPosts).not.toHaveBeenCalled();
        });

        it('يرمي الخطأ مباشرة عند 403 (banned)', async () => {
            (SecureAPIClient.fetchSecure as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new SecureFetchError('forbidden', 403, '', '/api/forum/posts'),
            );
            await expect(ForumApiService.listPostsPaginated(10, 0)).rejects.toThrow('forbidden');
            expect(lawyerCloudMocks.listPosts).not.toHaveBeenCalled();
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

    describe('deletePost', () => {
        it('يرمي بدون تسجيل دخول', async () => {
            (supabaseModule.supabase.auth.getSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                data: { session: null },
            });
            await expect(ForumApiService.deletePost('p1', 'author-1', false)).rejects.toThrow('يجب تسجيل الدخول');
        });
    });
});
