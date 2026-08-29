import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    gateMock,
    getClientMock,
    consumeRateMock,
    listBansMock,
    upsertBanMock,
    deleteBanMock,
    resolveTargetMock,
} = vi.hoisted(() => ({
    gateMock: vi.fn(),
    getClientMock: vi.fn(),
    consumeRateMock: vi.fn(),
    listBansMock: vi.fn(),
    upsertBanMock: vi.fn(),
    deleteBanMock: vi.fn(),
    resolveTargetMock: vi.fn(),
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
    notifyHeadquartersForumStatus: vi.fn(async () => undefined),
}));

vi.mock('../../security/headquartersForumInboxQuery.ts', () => ({
    HEADQUARTERS_FORUM_INBOX_CAP: 80,
    listHeadquartersBannedUsers: (...a: unknown[]) => listBansMock(...a),
    upsertHeadquartersForumBan: (...a: unknown[]) => upsertBanMock(...a),
    deleteHeadquartersForumBan: (...a: unknown[]) => deleteBanMock(...a),
}));

vi.mock('../../security/headquartersControlTarget.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/headquartersControlTarget.ts')>();
    return {
        ...actual,
        resolveHeadquartersControlTarget: (...a: unknown[]) => resolveTargetMock(...a),
    };
});

import { GET, POST } from './route.ts';
import { notifyHeadquartersForumStatus } from '../../security/headquartersAccountNotify.ts';

const ADMIN = 'cccccccc-dddd-4eee-8fff-000000000001';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function jsonReq(url: string, body?: unknown, method: 'GET' | 'POST' = 'GET'): Request {
    return new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('forum/ban HQ decide', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        gateMock.mockResolvedValue({ ok: true, userId: ADMIN });
        consumeRateMock.mockResolvedValue(true);
        getClientMock.mockReturnValue({ from: vi.fn() });
        listBansMock.mockResolvedValue([]);
        upsertBanMock.mockResolvedValue(undefined);
        deleteBanMock.mockResolvedValue('ok');
        resolveTargetMock.mockResolvedValue({
            ok: true,
            user: {
                id: TARGET,
                email: 't@t.t',
                fullName: 'الاسم الحقيقي',
                familyName: '',
                role: 'lawyer',
            },
        });
    });

    it('GET يعيد القائمة وcapped', async () => {
        listBansMock.mockResolvedValue([{ userId: TARGET, userName: 'محظور', reason: 'إساءة', bannedAt: '2026-08-01T00:00:00.000Z' }]);
        const res = await GET(jsonReq('https://app.test/api/forum/ban'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ ok: true, capped: false });
        expect(listBansMock).toHaveBeenCalledTimes(1);
    });

    it('ban يخزّن اسم الملف لا اسم العميل', async () => {
        const res = await POST(
            jsonReq(
                'https://app.test/api/forum/ban',
                {
                    action: 'ban',
                    userId: TARGET,
                    userName: 'اسم مزوّر',
                    reason: 'إساءة واضحة',
                    durationHours: 24,
                },
                'POST',
            ),
        );
        expect(res.status).toBe(200);
        expect(upsertBanMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                userId: TARGET,
                userName: 'الاسم الحقيقي',
                reason: 'إساءة واضحة',
            }),
        );
        const stored = upsertBanMock.mock.calls[0]?.[1] as { expiresAt?: string };
        expect(stored.expiresAt).toBeTruthy();
    });

    it('يرفض مدة أو انتهاءً غير صالحين بلا كتابة', async () => {
        getClientMock.mockClear();
        const duration = await POST(
            jsonReq(
                'https://app.test/api/forum/ban',
                { action: 'ban', userId: TARGET, userName: 'س', reason: 'إساءة', durationHours: 99 },
                'POST',
            ),
        );
        const past = await POST(
            jsonReq(
                'https://app.test/api/forum/ban',
                {
                    action: 'ban',
                    userId: TARGET,
                    userName: 'س',
                    reason: 'إساءة',
                    expiresAt: '2020-01-01T00:00:00.000Z',
                },
                'POST',
            ),
        );
        expect(duration.status).toBe(400);
        expect(past.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
        expect(upsertBanMock).not.toHaveBeenCalled();
    });

    it('unban بلا صف يعيد 404 ولا يُشعر', async () => {
        deleteBanMock.mockResolvedValue('missing');
        const res = await POST(
            jsonReq('https://app.test/api/forum/ban', { action: 'unban', userId: TARGET }, 'POST'),
        );
        expect(res.status).toBe(404);
        expect(notifyHeadquartersForumStatus).not.toHaveBeenCalled();
    });
});
