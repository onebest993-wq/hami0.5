import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '@/app/services/forum/forumTypes';

const getPostByIdMock = vi.fn();
const addCommentMock = vi.fn();
const toggleCommentUpvoteMock = vi.fn();
const reportCommentMock = vi.fn();
const createGroupMock = vi.fn();
const followMock = vi.fn();
const rateLimitMock = vi.fn();
const authIdentityMock = vi.fn();
const assertCommentAccessMock = vi.fn();

vi.mock('../../services/forum/forumRepository.ts', () => ({
    ForumRepository: {
        getPostById: (...args: unknown[]) => getPostByIdMock(...args),
        addComment: (...args: unknown[]) => addCommentMock(...args),
        toggleCommentUpvote: (...args: unknown[]) => toggleCommentUpvoteMock(...args),
        reportComment: (...args: unknown[]) => reportCommentMock(...args),
    },
}));

vi.mock('../../services/forum/forumGroupRepository.ts', () => ({
    ForumGroupRepository: {
        createGroup: (...args: unknown[]) => createGroupMock(...args),
        listGroups: vi.fn(),
        isMember: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../../services/forum/forumFollowRepository.ts', () => ({
    ForumFollowRepository: {
        follow: (...args: unknown[]) => followMock(...args),
        unfollow: vi.fn(),
        getFollowing: vi.fn(),
        getFollowers: vi.fn(),
    },
}));

vi.mock('../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock('../../services/forum/forumCommentAccess.ts', () => ({
    assertForumCommentGroupAccess: (...args: unknown[]) => assertCommentAccessMock(...args),
}));

vi.mock('../../services/forum/forumNotificationDispatch.ts', () => ({
    dispatchNewFollowerNotification: vi.fn(),
}));

vi.mock('../../services/forum/forumAuthorResolver.ts', () => ({
    resolveForumAuthorDisplayName: vi.fn().mockResolvedValue('محامٍ'),
}));

vi.mock('./_auth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./_auth.ts')>();
    return {
        ...actual,
        requireForumAuth: (...args: unknown[]) => authIdentityMock(...args),
        requireForumAuthAndUnbanned: (...args: unknown[]) => authIdentityMock(...args),
        assertForumWriteAllowed: () => ({ ok: true }),
    };
});

import { POST as commentPost } from './comment/route.ts';
import { POST as commentUpvotePost } from './comment-upvote/route.ts';
import { POST as commentReportPost } from './comment-report/route.ts';
import { POST as groupsPost } from './groups/route.ts';
import { POST as followPost } from './follow/route.ts';

function jsonRequest(url: string, body: Record<string, unknown>): Request {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function openPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'post-1',
        authorId: 'owner-1',
        authorName: 'مالك',
        content: 'منشور قانوني مفتوح للنقاش بمحتوى كافٍ',
        tags: [],
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        comments: [
            {
                id: 'c-root',
                postId: 'post-1',
                authorId: 'owner-1',
                authorName: 'مالك',
                content: 'تعليق أصل',
                createdAt: '2026-07-01T00:00:00.000Z',
            },
        ],
        upvoterIds: [],
        ...overrides,
    } as CommunityPost;
}

describe('سيناريوهات أمان مسارات المنتدى', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        rateLimitMock.mockResolvedValue(true);
        assertCommentAccessMock.mockResolvedValue(undefined);
        getPostByIdMock.mockResolvedValue(openPost());
        addCommentMock.mockImplementation(async (_id: string, comment: unknown) =>
            openPost({ comments: [comment as CommunityPost['comments'][number]] }),
        );
        toggleCommentUpvoteMock.mockResolvedValue({ upvoted: true, upvoterIds: ['user-1'] });
        reportCommentMock.mockResolvedValue({ ok: true });
        createGroupMock.mockResolvedValue({ id: 'g1', name: 'مجموعة' });
        followMock.mockResolvedValue({ followerId: 'user-1', followingId: 'target-1' });
        authIdentityMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });
    });

    it('يرفض التعليق على منشور مقفل بـ 423 دون استهلاك حد المعدّل', async () => {
        getPostByIdMock.mockResolvedValue(openPost({ isLocked: true }));
        const res = await commentPost(
            jsonRequest('http://localhost/api/forum/comment', {
                action: 'add',
                postId: 'post-1',
                comment: { authorId: 'user-1', content: 'محاولة على مقفل' },
            }),
        );
        expect(res.status).toBe(423);
        expect(rateLimitMock).not.toHaveBeenCalled();
        expect(addCommentMock).not.toHaveBeenCalled();
    });

    it('يرفض parentId لا ينتمي للمنشور', async () => {
        const res = await commentPost(
            jsonRequest('http://localhost/api/forum/comment', {
                action: 'add',
                postId: 'post-1',
                comment: { authorId: 'user-1', content: 'رد مزيف', parentId: 'other-post-c' },
            }),
        );
        expect(res.status).toBe(400);
        expect(addCommentMock).not.toHaveBeenCalled();
    });

    it('يرفض تصويت تعليق مجموعة خاصة لغير العضو', async () => {
        assertCommentAccessMock.mockRejectedValue(new Error('يجب الانضمام للمجموعة قبل التفاعل مع منشوراتها'));
        const res = await commentUpvotePost(
            jsonRequest('http://localhost/api/forum/comment-upvote', { commentId: 'c-secret' }),
        );
        expect(res.status).toBe(403);
        expect(toggleCommentUpvoteMock).not.toHaveBeenCalled();
    });

    it('يرفض بلاغ تعليق غير موجود دون التسجيل', async () => {
        assertCommentAccessMock.mockRejectedValue(new Error('التعليق غير موجود'));
        const res = await commentReportPost(
            jsonRequest('http://localhost/api/forum/comment-report', {
                commentId: 'missing',
                reason: 'سبب كافٍ للإبلاغ',
            }),
        );
        expect(res.status).toBe(404);
        expect(reportCommentMock).not.toHaveBeenCalled();
    });

    it('يلغي غلاف مجموعة javascript: قبل الإنشاء', async () => {
        const res = await groupsPost(
            jsonRequest('http://localhost/api/forum/groups', {
                name: 'مجموعة نقاش',
                description: 'وصف كافٍ للمجموعة القانونية',
                coverImage: 'javascript:alert(1)',
            }),
        );
        expect(res.status).toBe(200);
        expect(createGroupMock).toHaveBeenCalledWith(
            'user-1',
            expect.objectContaining({ coverImage: null }),
            false,
        );
    });

    it('يوقف إنشاء المجموعات عند حد المعدّل', async () => {
        rateLimitMock.mockResolvedValue(false);
        const res = await groupsPost(
            jsonRequest('http://localhost/api/forum/groups', {
                name: 'مجموعة نقاش',
                description: 'وصف كافٍ للمجموعة القانونية',
            }),
        );
        expect(res.status).toBe(429);
        expect(createGroupMock).not.toHaveBeenCalled();
    });

    it('يوقف المتابعة عند حد المعدّل', async () => {
        rateLimitMock.mockResolvedValue(false);
        const res = await followPost(
            jsonRequest('http://localhost/api/forum/follow', {
                action: 'follow',
                followingId: 'target-1',
            }),
        );
        expect(res.status).toBe(429);
        expect(followMock).not.toHaveBeenCalled();
    });
});
