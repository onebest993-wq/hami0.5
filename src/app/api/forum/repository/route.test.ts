import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireForumAuthMock = vi.fn();
const requireForumAuthAndUnbannedMock = vi.fn();
const rateLimitMock = vi.fn(async () => true);
const listDocsMock = vi.fn(async () => [{ id: 'd1' }]);
const createDocMock = vi.fn(async (doc: unknown) => doc);
const sanitizeMock = vi.fn((raw: unknown, authorId: string) => ({
    ...(raw as object),
    id: 'minted',
    authorId,
    storagePath: 'user-1/repository/a.pdf',
}));
const updateDocMock = vi.fn(async (docId: string) => ({ id: docId, title: 'محدَّث' }));
const deleteDocMock = vi.fn(async () => undefined);
const sanitizePatchMock = vi.fn((raw: unknown) => ({ ...(raw as object), updated_at: 'now' }));

vi.mock('../_auth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../_auth.ts')>();
    return {
        ...actual,
        requireForumAuth: (...args: unknown[]) => requireForumAuthMock(...args),
        requireForumAuthAndUnbanned: (...args: unknown[]) => requireForumAuthAndUnbannedMock(...args),
    };
});

vi.mock('../../../services/forum/forumRateLimitServer.ts', () => ({
    checkForumActionRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));

vi.mock('../../../services/forum/forumAuthorResolver.ts', () => ({
    resolveForumAuthorDisplayName: vi.fn(async () => 'محامي موثوق'),
}));

vi.mock('../../../services/forum/forumRepositoryDocs.ts', () => ({
    listForumRepositoryDocsOnServer: (...args: unknown[]) => listDocsMock(...args),
    createForumRepositoryDocOnServer: (...args: unknown[]) => createDocMock(...args),
    updateForumRepositoryDocOnServer: (...args: unknown[]) => updateDocMock(...args),
    deleteForumRepositoryDocOnServer: (...args: unknown[]) => deleteDocMock(...args),
}));

const sweepMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('../../../services/forum/forumRepositoryOrphanSweep.ts', () => ({
    sweepForumRepositoryOrphansForUser: (...args: unknown[]) => sweepMock(...args),
}));

vi.mock('../../../services/forum/forumRepositoryDocsSanitize.ts', () => ({
    sanitizeForumRepositoryDocument: (...args: unknown[]) => sanitizeMock(...args),
    sanitizeForumRepositoryDocumentPatch: (...args: unknown[]) => sanitizePatchMock(...args),
}));

function postJson(body: unknown): Request {
    return new Request('http://localhost/api/forum/repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

import { GET, POST } from './route.ts';

describe('/api/forum/repository', () => {
    beforeEach(() => {
        requireForumAuthMock.mockReset();
        requireForumAuthAndUnbannedMock.mockReset();
        rateLimitMock.mockClear();
        updateDocMock.mockClear();
        deleteDocMock.mockClear();
        createDocMock.mockClear();
        sweepMock.mockClear();
        sweepMock.mockResolvedValue(undefined);
        rateLimitMock.mockResolvedValue(true);
        requireForumAuthMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 't',
            isAdmin: false,
        });
        requireForumAuthAndUnbannedMock.mockResolvedValue({
            ok: true,
            userId: 'user-1',
            token: 't',
            isAdmin: false,
        });
    });

    it('GET يعيد فهرس المستودع ويكنس يتامى المالك', async () => {
        const res = await GET(new Request('http://localhost/api/forum/repository'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; documents: unknown[] };
        expect(body.documents).toEqual([{ id: 'd1' }]);
        expect(sweepMock).toHaveBeenCalledWith('user-1');
    });

    it('POST create يرفض المرفق المحلي عبر التعقيم', async () => {
        sanitizeMock.mockImplementationOnce(() => {
            throw new Error('يجب رفع الملف إلى الخادم قبل النشر');
        });
        const res = await POST(
            postJson({ action: 'create', document: { title: 'عقد', storagePath: 'idb:forum:x' } }),
        );
        expect(res.status).toBe(400);
        expect(createDocMock).not.toHaveBeenCalled();
    });

    it('POST update يحدّث الفهرس بالمعرّف ومالك الطلب', async () => {
        const res = await POST(
            postJson({ action: 'update', docId: 'd1', document: { title: 'محدَّث' } }),
        );
        expect(res.status).toBe(200);
        expect(updateDocMock).toHaveBeenCalledWith(
            'd1',
            expect.objectContaining({ updated_at: 'now' }),
            'user-1',
            false,
        );
    });

    it('POST update بلا معرّف مرفوض', async () => {
        const res = await POST(postJson({ action: 'update', document: { title: 'x' } }));
        expect(res.status).toBe(400);
        expect(updateDocMock).not.toHaveBeenCalled();
    });

    // حدّ الرفع المتشدد كان يخنق الحذف والتعديل حين كان يُفحص قبل قراءة action.
    it('الحذف والتعديل لا يشتركان مع حدّ الرفع', async () => {
        await POST(postJson({ action: 'create', document: { title: 'عقد' } }));
        await POST(postJson({ action: 'update', docId: 'd1', document: { title: 'x' } }));
        await POST(postJson({ action: 'delete', docId: 'd1' }));

        const actions = rateLimitMock.mock.calls.map((call) => call[1]);
        expect(actions).toEqual(['repository', 'repository_mutate', 'repository_mutate']);
        expect(deleteDocMock).toHaveBeenCalledWith('d1', 'user-1', false);
    });
});
