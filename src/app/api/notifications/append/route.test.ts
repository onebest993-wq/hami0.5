import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, appendServerMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    appendServerMock: vi.fn(),
}));

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/services/notifications/notificationServerBlob', () => ({
    appendIncomingNotificationServer: (...args: unknown[]) => appendServerMock(...args),
}));

import { POST } from './route.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

function jsonReq(body: Record<string, unknown>): Request {
    return new Request('http://127.0.0.1/api/notifications/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/notifications/append', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-1' });
        appendServerMock.mockResolvedValue({ id: 'n1', title: 't', message: 'm' });
    });

    it('يرفض انتحال تنبيه نظام المقر من العميل', async () => {
        const res = await POST(
            jsonReq({
                title: 'تنبيه المقر',
                message: 'تم تجميد حسابك',
                type: 'system_alert',
                category: 'system',
            }),
        );
        expect(res.status).toBe(403);
        expect(appendServerMock).not.toHaveBeenCalled();
    });

    it('يرفض النوع الافتراضي السابق system_alert عند غياب type', async () => {
        const res = await POST(jsonReq({ title: 'تنبيه', message: 'نص' }));
        expect(res.status).toBe(403);
        expect(appendServerMock).not.toHaveBeenCalled();
    });

    it('يسمح بردّ منتدى من صاحب الجلسة فقط', async () => {
        const res = await POST(
            jsonReq({
                title: 'رد',
                message: 'تعليق جديد',
                type: 'forum_reply',
                category: 'forum',
            }),
        );
        expect(res.status).toBe(200);
        expect(appendServerMock).toHaveBeenCalledWith(
            'lawyer-1',
            expect.objectContaining({ type: 'forum_reply', category: 'forum' }),
        );
    });

    it('يرفض بلا جلسة', async () => {
        requireWifeUserMock.mockResolvedValue({
            ok: false,
            response: wifeJsonResponse(401, { ok: false, error: 'Unauthorized user' }),
        });
        const res = await POST(
            jsonReq({
                title: 'رد',
                message: 'تعليق',
                type: 'forum_reply',
                category: 'forum',
            }),
        );
        expect(res.status).toBe(401);
        expect(appendServerMock).not.toHaveBeenCalled();
    });
});
