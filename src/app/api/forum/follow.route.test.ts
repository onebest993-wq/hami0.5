import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFollowersMock = vi.fn();

vi.mock('../../services/forum/forumFollowRepository.ts', () => ({
    ForumFollowRepository: {
        getFollowers: (...args: unknown[]) => getFollowersMock(...args),
        getFollowing: vi.fn(),
    },
}));

const requireForumAuthMock = vi.fn();

vi.mock('./_auth.ts', () => ({
    requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
    jsonResponse: (status: number, body: Record<string, unknown>) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
}));

import { GET as followGet } from './follow/route.ts';

describe('forum follow route GET followers privacy', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        getFollowersMock.mockResolvedValue([{ followerId: 'f1', createdAt: '2026-01-01' }]);
    });

    it('يرفض عرض متابعي مستخدم آخر', async () => {
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });

        const res = await followGet(
            new Request('http://localhost/api/forum/follow?mode=followers&userId=other-user'),
        );
        expect(res.status).toBe(403);
        expect(getFollowersMock).not.toHaveBeenCalled();
    });

    it('يسمح للمستخدم برؤية متابعيه', async () => {
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 'tok',
            isAdmin: false,
        });

        const res = await followGet(
            new Request('http://localhost/api/forum/follow?mode=followers&userId=user-1'),
        );
        expect(res.status).toBe(200);
        expect(getFollowersMock).toHaveBeenCalledWith('user-1');
    });

    it('يسمح للمشرف برؤية متابعي أي مستخدم', async () => {
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
            isAdmin: true,
        });

        const res = await followGet(
            new Request('http://localhost/api/forum/follow?mode=followers&userId=other-user'),
        );
        expect(res.status).toBe(200);
        expect(getFollowersMock).toHaveBeenCalledWith('other-user');
    });
});
