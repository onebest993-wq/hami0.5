import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, mergeServerMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    mergeServerMock: vi.fn(),
}));

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/services/notifications/notificationServerBlob', () => ({
    mergeNotificationBlobServer: (...args: unknown[]) => mergeServerMock(...args),
}));

import { POST } from './route.ts';

function jsonReq(body: Record<string, unknown>): Request {
    return new Request('http://127.0.0.1/api/notifications/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/notifications/merge', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-1' });
        mergeServerMock.mockImplementation(async (_id: string, incoming: unknown[]) => incoming);
    });

    it('لا يمرّر تنبيه نظام المقر من العميل إلى الدمج', async () => {
        const res = await POST(
            jsonReq({
                notifications: [
                    {
                        id: 'hq-1',
                        title: 'تجميد',
                        message: 'حسابك',
                        type: 'system_alert',
                        category: 'system',
                        isRead: false,
                        createdAt: '2026-08-28T00:00:00.000Z',
                    },
                    {
                        id: 'f-1',
                        title: 'رد',
                        message: 'تعليق',
                        type: 'forum_reply',
                        category: 'forum',
                        isRead: false,
                        createdAt: '2026-08-28T00:00:00.000Z',
                    },
                ],
            }),
        );
        expect(res.status).toBe(200);
        expect(mergeServerMock).toHaveBeenCalledWith(
            'lawyer-1',
            expect.arrayContaining([expect.objectContaining({ id: 'f-1', type: 'forum_reply' })]),
        );
        const passed = mergeServerMock.mock.calls[0]?.[1] as Array<{ type?: string }>;
        expect(passed.some((n) => n.type === 'system_alert')).toBe(false);
    });
});
