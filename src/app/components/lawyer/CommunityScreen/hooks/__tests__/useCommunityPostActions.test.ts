import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

const syncPost = vi.fn();
const addNotification = vi.fn();
const publishComment = vi.fn();

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: {
        warning: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('@/app/services/forumApiService', () => ({
    ForumApiService: {
        syncPost: (...args: unknown[]) => syncPost(...args),
        deleteComment: vi.fn(),
        editComment: vi.fn(),
        deletePost: vi.fn(),
        toggleCommentUpvote: vi.fn(),
        reportComment: vi.fn(),
    },
}));

vi.mock('@/lib/forumService.js', () => ({
    publishForumComment: (...args: unknown[]) => publishComment(...args),
}));

vi.mock('@/app/services/notifications/notificationForumStorage', () => ({
    NotificationDB: {
        addNotification: (...args: unknown[]) => addNotification(...args),
    },
}));

import { useCommunityPostActions } from '../useCommunityPostActions';
import { ForumApiService } from '@/app/services/forumApiService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { peekForumRateLimit } from '../../forumRateLimit';

function basePost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'post-1',
        authorId: 'author-1',
        authorName: 'محامي',
        content: 'استشارة تجريبية طويلة بما يكفي',
        tags: [],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: [],
        comments: [
            {
                id: 'c1',
                postId: 'post-1',
                authorId: 'commenter-1',
                authorName: 'زميل',
                content: 'إجابة',
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ],
        bestCommentId: null,
        ...overrides,
    };
}

function renderActions(post: CommunityPost) {
    const updatePostList = vi.fn((postId: string, updater: (prev: CommunityPost[]) => CommunityPost[]) => {
        updater([post]);
    });
    const lists = {
        postsRef: { current: [post] },
        groupPostsRef: { current: [] as CommunityPost[] },
        setPosts: vi.fn(),
        setGroupPosts: vi.fn(),
        findPostById: (id: string) => (id === post.id ? post : null),
        updatePostList,
        removePostFromList: vi.fn(),
    };
    const hook = renderHook(() =>
        useCommunityPostActions({
            lists,
            currentUserId: 'author-1',
            isAdmin: false,
            isBanned: false,
            authUser: { user_metadata: { fullName: 'محامي' } },
            commentingPostId: post.id,
        }),
    );
    return { ...hook, updatePostList, lists };
}

describe('useCommunityPostActions', () => {
    beforeEach(() => {
        window.localStorage.clear();
        syncPost.mockReset();
        addNotification.mockReset();
        publishComment.mockReset();
        vi.mocked(ForumApiService.reportComment).mockReset();
        vi.mocked(SmartToast.warning).mockReset();
        vi.mocked(SmartToast.success).mockReset();
        vi.mocked(SmartToast.error).mockReset();
        vi.mocked(SmartToast.info).mockReset();
        syncPost.mockResolvedValue(basePost({ bestCommentId: 'c1' }));
        addNotification.mockResolvedValue(undefined);
    });

    it('ينبّه صاحب التعليق عند تمييز أفضل إجابة', async () => {
        const { result } = renderActions(basePost());

        await act(async () => {
            await result.current.handleToggleBestAnswer('post-1', 'c1');
        });

        expect(syncPost).toHaveBeenCalled();
        expect(addNotification).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: 'commenter-1',
                type: 'best_answer',
            }),
        );
    });

    it('لا ينبّه المؤلف إن ميّز تعليقه', async () => {
        const { result } = renderActions(
            basePost({
                comments: [
                    {
                        id: 'c1',
                        postId: 'post-1',
                        authorId: 'author-1',
                        authorName: 'محامي',
                        content: 'إجابتي',
                        createdAt: '2026-01-01T00:00:00.000Z',
                    },
                ],
            }),
        );

        await act(async () => {
            await result.current.handleToggleBestAnswer('post-1', 'c1');
        });

        expect(addNotification).not.toHaveBeenCalled();
    });

    it('يرفض التعليق على نقاش مقفل', async () => {
        const { result } = renderActions(basePost({ isLocked: true }));

        let ok = true;
        await act(async () => {
            ok = await result.current.handleAddComment('post-1', 'تعليق جديد');
        });

        expect(ok).toBe(false);
        expect(publishComment).not.toHaveBeenCalled();
        expect(SmartToast.warning).toHaveBeenCalledWith('النقاش مقفل');
    });

    it('يرفض التعليق الفارغ دون طلب الخادم', async () => {
        const { result } = renderActions(basePost());
        let ok = true;
        await act(async () => {
            ok = await result.current.handleAddComment('post-1', '   ');
        });
        expect(ok).toBe(false);
        expect(publishComment).not.toHaveBeenCalled();
        expect(SmartToast.warning).toHaveBeenCalledWith('لا يمكن نشر تعليق فارغ');
    });

    it('لا يستهلك حد التعليق إذا فشل النشر', async () => {
        publishComment.mockRejectedValueOnce(new Error('fail'));
        const { result } = renderActions(basePost());
        await act(async () => {
            await result.current.handleAddComment('post-1', 'تعليق جديد كافٍ');
        });
        expect(SmartToast.error).toHaveBeenCalledWith('تعذّر نشر التعليق');
        expect(peekForumRateLimit('comment', 'author-1').allowed).toBe(true);
    });

    it('يستهلك حد التعليق بعد نجاح النشر', async () => {
        publishComment.mockResolvedValueOnce(basePost());
        const { result } = renderActions(basePost());
        await act(async () => {
            await result.current.handleAddComment('post-1', 'تعليق جديد كافٍ');
        });
        expect(SmartToast.success).toHaveBeenCalledWith('تم نشر التعليق');
        expect(peekForumRateLimit('comment', 'author-1').allowed).toBe(false);
    });

    it('لا يستهلك حد إبلاغ التعليق إذا فشل الخادم', async () => {
        vi.mocked(ForumApiService.reportComment).mockRejectedValueOnce(new Error('fail'));
        const { result } = renderActions(basePost());
        await act(async () => {
            await result.current.handleReportComment('c1');
        });
        expect(SmartToast.error).toHaveBeenCalledWith('تعذّر إرسال البلاغ');
        expect(peekForumRateLimit('report', 'author-1', { postId: 'comment:c1' }).allowed).toBe(true);
    });

    it('يستهلك حد إبلاغ التعليق بعد نجاح البلاغ', async () => {
        vi.mocked(ForumApiService.reportComment).mockResolvedValueOnce({ ok: true });
        const { result } = renderActions(basePost());
        await act(async () => {
            await result.current.handleReportComment('c1');
        });
        expect(SmartToast.success).toHaveBeenCalledWith('تم رفع البلاغ');
        expect(peekForumRateLimit('report', 'author-1', { postId: 'comment:c1' }).allowed).toBe(false);
    });
});
