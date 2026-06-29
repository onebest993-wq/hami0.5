import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

const savePostMock = vi.fn();
const deletePostAuthorizedMock = vi.fn();
const togglePinMock = vi.fn();
const isBannedMock = vi.fn();
const getPostByIdMock = vi.fn();

vi.mock('../../services/forum/forumRepository.ts', () => ({
    ForumRepository: {
        savePost: (...args: unknown[]) => savePostMock(...args),
        deletePostAuthorized: (...args: unknown[]) => deletePostAuthorizedMock(...args),
        togglePin: (...args: unknown[]) => togglePinMock(...args),
        isBanned: (...args: unknown[]) => isBannedMock(...args),
        getPostById: (...args: unknown[]) => getPostByIdMock(...args),
        listPosts: vi.fn(),
    },
}));

vi.mock('../../services/forum/forumGroupRepository.ts', () => ({
    ForumGroupRepository: {
        isMember: vi.fn().mockResolvedValue(true),
    },
}));

vi.mock('../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../services/forum/forumNotificationDispatch.ts', () => ({
    dispatchFollowedUserNewPost: vi.fn(),
    dispatchPostUpvoteNotification: vi.fn(),
    dispatchBestAnswerNotification: vi.fn(),
}));

vi.mock('../../services/forum/forumAuthorResolver.ts', () => ({
    resolveForumAuthorDisplayName: vi.fn().mockResolvedValue('محامي موثوق'),
}));

const requireForumAuthMock = vi.fn();
const requireForumAuthAndUnbannedMock = vi.fn();

vi.mock('./_auth.ts', () => ({
    requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
    requireForumAuthAndUnbanned: (...args: unknown[]) => requireForumAuthAndUnbannedMock(...args),
    jsonResponse: (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
}));

import { POST as postsPost } from './posts/route.ts';
import { POST as pinPost } from './pin/route.ts';
import { POST as deletePost } from './delete/route.ts';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'post-1',
        authorId: 'user-1',
        authorName: 'محامي',
        content: 'محتوى منشور تجريبي طويل بما يكفي للنشر',
        tags: ['قانون'],
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        attachment: null,
        upvoterIds: ['attacker-id'],
        comments: [
            {
                id: 'c1',
                postId: 'post-1',
                authorId: 'attacker-id',
                authorName: 'مهاجم',
                content: 'تعليق محقون',
                createdAt: '2026-01-01T00:00:00.000Z',
            },
        ],
        bestCommentId: 'c1',
        isPinned: true,
        isLocked: true,
        ...overrides,
    };
}

function jsonRequest(url: string, body: unknown): Request {
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
    return res.json() as Promise<Record<string, unknown>>;
}

describe('forum posts route POST create', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireForumAuthAndUnbannedMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });
        savePostMock.mockImplementation(async (post: CommunityPost) => post);
    });

    it('يزيل isPinned/isLocked/upvoterIds/comments قبل الحفظ', async () => {
        const res = await postsPost(
            jsonRequest('http://localhost/api/forum/posts', {
                action: 'create',
                post: buildPost(),
            }),
        );
        expect(res.status).toBe(200);
        const saved = savePostMock.mock.calls[0]?.[0] as CommunityPost;
        expect(saved.isPinned).toBeUndefined();
        expect(saved.isLocked).toBeUndefined();
        expect(saved.upvoterIds).toEqual([]);
        expect(saved.comments).toEqual([]);
        expect(saved.bestCommentId).toBeNull();
    });

    it('يرفض إنشاء منشور بمعرّف ناشر مختلف عن الجلسة', async () => {
        const res = await postsPost(
            jsonRequest('http://localhost/api/forum/posts', {
                action: 'create',
                post: buildPost({ authorId: 'other-user' }),
            }),
        );
        expect(res.status).toBe(403);
        expect(savePostMock).not.toHaveBeenCalled();
    });
});

describe('forum posts route POST sync', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireForumAuthAndUnbannedMock.mockResolvedValue({
            ok: true,
            userId: 'voter-1',
            token: 'tok',
            isAdmin: false,
        });
        getPostByIdMock.mockResolvedValue(
            buildPost({
                authorId: 'owner-1',
                upvoterIds: ['a'],
                bestCommentId: null,
                comments: [],
            }),
        );
        savePostMock.mockImplementation(async (post: CommunityPost) => post);
    });

    it('يسمح بتبديل تصويت المصوّت الحالي فقط', async () => {
        const res = await postsPost(
            jsonRequest('http://localhost/api/forum/posts', {
                action: 'sync',
                post: buildPost({
                    authorId: 'owner-1',
                    upvoterIds: ['a', 'voter-1'],
                    bestCommentId: null,
                    comments: [],
                }),
            }),
        );
        expect(res.status).toBe(200);
        const saved = savePostMock.mock.calls[0]?.[0] as CommunityPost;
        expect(saved.upvoterIds).toEqual(['a', 'voter-1']);
    });

    it('يرفض حقن معرّفات تصويت أجنبية', async () => {
        const res = await postsPost(
            jsonRequest('http://localhost/api/forum/posts', {
                action: 'sync',
                post: buildPost({
                    authorId: 'owner-1',
                    upvoterIds: ['a', 'attacker', 'voter-1'],
                }),
            }),
        );
        expect(res.status).toBe(403);
        expect(savePostMock).not.toHaveBeenCalled();
    });

    it('يرفض تغيير أفضل إجابة من غير المالك', async () => {
        const res = await postsPost(
            jsonRequest('http://localhost/api/forum/posts', {
                action: 'sync',
                post: buildPost({
                    authorId: 'owner-1',
                    upvoterIds: ['a'],
                    bestCommentId: 'c1',
                }),
            }),
        );
        expect(res.status).toBe(403);
        expect(savePostMock).not.toHaveBeenCalled();
    });
});

describe('forum pin route POST', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        togglePinMock.mockResolvedValue(buildPost({ isPinned: true }));
    });

    it('يرفض التثبيت لغير المشرف', async () => {
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });

        const res = await pinPost(
            jsonRequest('http://localhost/api/forum/pin', {
                postId: 'post-1',
                pinned: true,
            }),
        );
        expect(res.status).toBe(403);
        expect(togglePinMock).not.toHaveBeenCalled();
    });

    it('يسمح للمشرف بالتثبيت', async () => {
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
            isAdmin: true,
        });

        const res = await pinPost(
            jsonRequest('http://localhost/api/forum/pin', {
                postId: 'post-1',
                pinned: true,
            }),
        );
        expect(res.status).toBe(200);
        expect(togglePinMock).toHaveBeenCalledWith('post-1', true);
    });
});

describe('forum delete route POST', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        deletePostAuthorizedMock.mockResolvedValue(undefined);
        requireForumAuthAndUnbannedMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });
    });

    it('يستدعي deletePostAuthorized بمعرّف الجلسة', async () => {
        const res = await deletePost(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-1' }),
        );
        expect(res.status).toBe(200);
        expect(deletePostAuthorizedMock).toHaveBeenCalledWith('post-1', 'user-1', false);
    });

    it('يُمرّر isAdmin=true للمشرف', async () => {
        requireForumAuthAndUnbannedMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
            isAdmin: true,
        });

        const res = await deletePost(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-1' }),
        );
        expect(res.status).toBe(200);
        expect(deletePostAuthorizedMock).toHaveBeenCalledWith('post-1', 'admin-1', true);
    });

    it('يرجع 403 عند رفض الصلاحية من المستودع', async () => {
        deletePostAuthorizedMock.mockRejectedValue(new Error('ليس لديك صلاحية لحذف هذا المنشور'));

        const res = await deletePost(
            jsonRequest('http://localhost/api/forum/delete', { postId: 'post-1' }),
        );
        expect(res.status).toBe(403);
        const body = await readJson(res);
        expect(body.error).toContain('صلاحية');
    });
});
