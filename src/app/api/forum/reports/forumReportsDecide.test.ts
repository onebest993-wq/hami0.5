import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    gateMock,
    getClientMock,
    consumeRateMock,
    listPostsMock,
    listCommentsMock,
    dismissPostMock,
    dismissCommentMock,
    deletePostMock,
    deleteCommentMock,
    loadPostReportMock,
    loadCommentReportMock,
    postNoticesMock,
    commentNoticesMock,
} = vi.hoisted(() => ({
    gateMock: vi.fn(),
    getClientMock: vi.fn(),
    consumeRateMock: vi.fn(),
    listPostsMock: vi.fn(),
    listCommentsMock: vi.fn(),
    dismissPostMock: vi.fn(),
    dismissCommentMock: vi.fn(),
    deletePostMock: vi.fn(),
    deleteCommentMock: vi.fn(),
    loadPostReportMock: vi.fn(),
    loadCommentReportMock: vi.fn(),
    postNoticesMock: vi.fn(),
    commentNoticesMock: vi.fn(),
}));

vi.mock('../../security/requireTrustedHeadquartersAdmin.ts', () => ({
    requireTrustedHeadquartersAdmin: (...a: unknown[]) => gateMock(...a),
}));

vi.mock('../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

vi.mock('../../security/wifeRateLimitStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/wifeRateLimitStore.ts')>();
    return {
        ...actual,
        consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
    };
});

vi.mock('../../security/headquartersAudit.ts', () => ({
    recordHeadquartersAudit: vi.fn(async () => undefined),
}));

vi.mock('../../security/headquartersAccountNotify.ts', () => ({
    notifyHeadquartersModeration: vi.fn(async () => undefined),
}));

vi.mock('../../security/headquartersForumInboxQuery.ts', () => ({
    HEADQUARTERS_FORUM_INBOX_CAP: 80,
    listHeadquartersPendingReports: (...a: unknown[]) => listPostsMock(...a),
    listHeadquartersPendingCommentReports: (...a: unknown[]) => listCommentsMock(...a),
    dismissHeadquartersForumReport: (...a: unknown[]) => dismissPostMock(...a),
    dismissHeadquartersCommentReport: (...a: unknown[]) => dismissCommentMock(...a),
    deleteHeadquartersReportedPost: (...a: unknown[]) => deletePostMock(...a),
    deleteHeadquartersReportedComment: (...a: unknown[]) => deleteCommentMock(...a),
    loadPendingForumReport: (...a: unknown[]) => loadPostReportMock(...a),
    loadPendingCommentReport: (...a: unknown[]) => loadCommentReportMock(...a),
    listPendingPostReportNotices: (...a: unknown[]) => postNoticesMock(...a),
    listPendingCommentReportNotices: (...a: unknown[]) => commentNoticesMock(...a),
}));

import { GET, POST } from './route.ts';

const ADMIN = 'cccccccc-dddd-4eee-8fff-000000000001';
const REPORT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01';
const POST_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee02';
const OTHER_POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee09';

function jsonReq(url: string, body?: unknown, method: 'GET' | 'POST' = 'GET'): Request {
    return new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('forum/reports HQ decide', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        gateMock.mockResolvedValue({ ok: true, userId: ADMIN });
        consumeRateMock.mockResolvedValue(true);
        getClientMock.mockReturnValue({ from: vi.fn() });
        listPostsMock.mockResolvedValue([]);
        listCommentsMock.mockResolvedValue([]);
        postNoticesMock.mockResolvedValue([]);
        commentNoticesMock.mockResolvedValue([]);
    });

    it('GET يجلب المنشورات والتعليقات معاً بلا reporterId', async () => {
        listPostsMock.mockResolvedValue([
            { id: REPORT, postId: POST_ID, reason: 'إساءة', createdAt: '2026-08-01T00:00:00.000Z', post: null },
        ]);
        listCommentsMock.mockResolvedValue([]);
        const res = await GET(jsonReq('https://app.test/api/forum/reports'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { reports: Array<Record<string, unknown>>; capped: boolean };
        expect(body.capped).toBe(false);
        expect(body.reports[0]).not.toHaveProperty('reporterId');
        expect(listPostsMock).toHaveBeenCalledTimes(1);
        expect(listCommentsMock).toHaveBeenCalledTimes(1);
    });

    it('delete_post بلا UUID يُرفض ولا يحذف', async () => {
        const res = await POST(
            jsonReq('https://app.test/api/forum/reports', { action: 'delete_post', postId: 'p1', reportId: 'r1' }, 'POST'),
        );
        expect(res.status).toBe(400);
        expect(deletePostMock).not.toHaveBeenCalled();
        expect(loadPostReportMock).not.toHaveBeenCalled();
    });

    it('delete_post يرفض بلاغاً لا يطابق المنشور', async () => {
        loadPostReportMock.mockResolvedValue({ id: REPORT, postId: OTHER_POST });
        const res = await POST(
            jsonReq(
                'https://app.test/api/forum/reports',
                { action: 'delete_post', postId: POST_ID, reportId: REPORT },
                'POST',
            ),
        );
        expect(res.status).toBe(400);
        expect(deletePostMock).not.toHaveBeenCalled();
    });

    it('delete_post يقرأ المبلِّغين قبل الحذف حتى لا يبتلعهم CASCADE', async () => {
        const order: string[] = [];
        loadPostReportMock.mockResolvedValue({ id: REPORT, postId: POST_ID });
        postNoticesMock.mockImplementation(async () => {
            order.push('notices');
            return [{ reporterId: ADMIN, postId: POST_ID }];
        });
        deletePostMock.mockImplementation(async () => {
            order.push('delete');
            return 'ok';
        });
        const res = await POST(
            jsonReq(
                'https://app.test/api/forum/reports',
                { action: 'delete_post', postId: POST_ID, reportId: REPORT },
                'POST',
            ),
        );
        expect(res.status).toBe(200);
        expect(order).toEqual(['notices', 'delete']);
    });
});
