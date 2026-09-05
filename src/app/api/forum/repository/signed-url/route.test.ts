import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireForumAuthMock = vi.fn();
const rateLimitMock = vi.fn(async () => true);
const signMock = vi.fn(async () => 'https://cdn/signed');

vi.mock('../../_auth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../_auth.ts')>();
    return {
        ...actual,
        requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
    };
});

vi.mock('../../../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock('../../../../services/forum/forumRepositoryDocs.ts', () => ({
    signForumRepositoryDocPath: (...args: unknown[]) => signMock(...args),
}));

import { POST } from './route.ts';

function postPath(body: unknown): Request {
    return new Request('http://localhost/api/forum/repository/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/forum/repository/signed-url', () => {
    beforeEach(() => {
        requireForumAuthMock.mockReset();
        signMock.mockClear();
        rateLimitMock.mockResolvedValue(true);
        signMock.mockResolvedValue('https://cdn/signed');
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'reader-1',
            token: 't',
            isAdmin: false,
        });
    });

    it('يوقّع مستند محامٍ آخر ما دام مفهرساً', async () => {
        const res = await POST(postPath({ path: 'author-9/repository/a.pdf' }));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { downloadUrl: string };
        expect(body.downloadUrl).toBe('https://cdn/signed');
        expect(signMock).toHaveBeenCalledWith('author-9/repository/a.pdf');
    });

    it('يرفض مساراً خارج الفهرس', async () => {
        signMock.mockResolvedValueOnce(null);
        const res = await POST(postPath({ path: 'author-9/vault/secret.pdf' }));
        expect(res.status).toBe(404);
    });

    it('يرفض غير المصادق قبل أي توقيع', async () => {
        requireForumAuthMock.mockResolvedValueOnce({
            response: new Response(JSON.stringify({ ok: false }), { status: 401 }),
        });
        const res = await POST(postPath({ path: 'author-9/repository/a.pdf' }));
        expect(res.status).toBe(401);
        expect(signMock).not.toHaveBeenCalled();
    });

    it('يحترم حدّ المعدّل', async () => {
        rateLimitMock.mockResolvedValueOnce(false);
        const res = await POST(postPath({ path: 'author-9/repository/a.pdf' }));
        expect(res.status).toBe(429);
        expect(signMock).not.toHaveBeenCalled();
    });
});
