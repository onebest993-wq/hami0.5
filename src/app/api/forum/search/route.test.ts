import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireForumAuthMock = vi.fn();
const rateLimitMock = vi.fn(async () => true);
const searchPostsMock = vi.fn(async () => [{ id: 'p1' }]);
const searchDocsMock = vi.fn(async () => [{ id: 'd1' }]);

vi.mock('../_auth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../_auth.ts')>();
    return {
        ...actual,
        requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
    };
});

vi.mock('../../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock('../../../services/forum/forumRepositorySearch.ts', () => ({
    searchForumPostsOnServer: (...args: unknown[]) => searchPostsMock(...args),
}));

vi.mock('../../../services/forum/forumRepositoryDocs.ts', () => ({
    searchForumRepositoryDocsOnServer: (...args: unknown[]) => searchDocsMock(...args),
}));

import { GET } from './route.ts';

describe('GET /api/forum/search', () => {
    beforeEach(() => {
        requireForumAuthMock.mockReset();
        rateLimitMock.mockResolvedValue(true);
        searchPostsMock.mockResolvedValue([{ id: 'p1' }]);
        searchDocsMock.mockResolvedValue([{ id: 'd1' }]);
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 't',
            isAdmin: false,
        });
    });

    it('يرفض غير المصادق', async () => {
        requireForumAuthMock.mockResolvedValueOnce({
            response: new Response(JSON.stringify({ ok: false }), { status: 401 }),
        });
        const res = await GET(new Request('http://localhost/api/forum/search?q=عقد'));
        expect(res.status).toBe(401);
        expect(searchPostsMock).not.toHaveBeenCalled();
    });

    it('يبحث في المنشورات والمستودع معاً', async () => {
        const res = await GET(new Request('http://localhost/api/forum/search?q=عقد&hasPdf=1'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; posts: unknown[]; documents: unknown[] };
        expect(body.ok).toBe(true);
        expect(body.posts).toEqual([{ id: 'p1' }]);
        expect(body.documents).toEqual([{ id: 'd1' }]);
        expect(rateLimitMock).toHaveBeenCalledWith('user-1', 'search');
        expect(searchPostsMock).toHaveBeenCalled();
        expect(searchDocsMock).toHaveBeenCalledWith(
            expect.objectContaining({ q: 'عقد', hasPdf: true }),
            'user-1',
            false,
        );
    });
});
