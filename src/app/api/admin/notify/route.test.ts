import { beforeEach, describe, expect, it, vi } from 'vitest';

const gateMock = vi.fn();
const consumeRateMock = vi.fn();
const getClientMock = vi.fn();
const listIdsMock = vi.fn();
const notifyMessageMock = vi.fn();
const auditMock = vi.fn();

vi.mock('../../security/requireTrustedHeadquartersAdmin.ts', () => ({
    requireTrustedHeadquartersAdmin: (...a: unknown[]) => gateMock(...a),
}));

vi.mock('../../security/wifeRateLimitStore.ts', () => ({
    consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
}));

vi.mock('../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

vi.mock('../../security/headquartersUsers.ts', () => ({
    listHeadquartersNotifyRecipientIds: (...a: unknown[]) => listIdsMock(...a),
}));

vi.mock('../../security/headquartersAccountNotify.ts', () => ({
    notifyHeadquartersSystemMessage: (...a: unknown[]) => notifyMessageMock(...a),
}));

vi.mock('../../security/headquartersAudit.ts', () => ({
    recordHeadquartersAudit: (...a: unknown[]) => auditMock(...a),
}));

vi.mock('../../security/sanitizer.ts', () => ({
    sanitizePayload: (v: unknown) => v,
    isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

import { POST } from './route.ts';
import { HAMI_PLATFORM_ADMIN_UUID } from '../../security/roleResolver.ts';

const ADMIN = '11111111-2222-4333-8444-555555555555';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function jsonReq(body: unknown): Request {
    return new Request('https://app.test/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/admin/notify', () => {
    beforeEach(() => {
        gateMock.mockReset();
        consumeRateMock.mockReset();
        getClientMock.mockReset();
        listIdsMock.mockReset();
        notifyMessageMock.mockReset();
        auditMock.mockReset();
        gateMock.mockResolvedValue({ ok: true, userId: ADMIN, deviceFingerprint: 'admin-device-aaaa' });
        consumeRateMock.mockResolvedValue(true);
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: async (_col: string, ids: string[]) => ({
                        data: ids.map((id) => ({ id, role: 'lawyer' })),
                        error: null,
                    }),
                }),
            }),
        });
        notifyMessageMock.mockResolvedValue(true);
        auditMock.mockResolvedValue(true);
        listIdsMock.mockResolvedValue({ ids: [TARGET], capped: false });
    });

    it('يرفض من دون بوابة المقر', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await POST(jsonReq({ scope: 'all', title: 'ت', message: 'نص' }));
        expect(res.status).toBe(403);
        expect(notifyMessageMock).not.toHaveBeenCalled();
    });

    it('يرسل للكل عبر معرفات المقر', async () => {
        const res = await POST(jsonReq({ scope: 'all', title: 'تنبيه', message: 'صيانة الليلة' }));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { sent?: number };
        expect(body.sent).toBe(1);
        expect(notifyMessageMock).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: TARGET,
                title: 'تنبيه',
                message: 'صيانة الليلة',
            }),
        );
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'notify.system_all' }),
        );
    });

    it('يرسل لمحددين فقط', async () => {
        const res = await POST(
            jsonReq({ scope: 'users', userIds: [TARGET], title: 'خاص', message: 'رسالة فردية' }),
        );
        expect(res.status).toBe(200);
        expect(listIdsMock).not.toHaveBeenCalled();
        expect(notifyMessageMock).toHaveBeenCalledTimes(1);
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({ action: 'notify.system_users' }),
        );
    });

    it('يرفض الإرسال بلا مستلمين عند scope=users', async () => {
        const res = await POST(jsonReq({ scope: 'users', userIds: [], title: 'ت', message: 'ن' }));
        expect(res.status).toBe(400);
        expect(notifyMessageMock).not.toHaveBeenCalled();
    });

    it('يرفض إشعار مدير المنصّة في النطاق المحدد', async () => {
        const res = await POST(
            jsonReq({
                scope: 'users',
                userIds: [HAMI_PLATFORM_ADMIN_UUID],
                title: 'ت',
                message: 'نص كافٍ',
            }),
        );
        expect(res.status).toBe(403);
        expect(notifyMessageMock).not.toHaveBeenCalled();
    });

    it('يرفض إشعار حساب إدارة في النطاق المحدد', async () => {
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: async () => ({ data: [{ id: TARGET, role: 'admin' }], error: null }),
                }),
            }),
        });
        const res = await POST(
            jsonReq({ scope: 'users', userIds: [TARGET], title: 'ت', message: 'نص كافٍ' }),
        );
        expect(res.status).toBe(403);
        expect(notifyMessageMock).not.toHaveBeenCalled();
    });

    it('يرفض مستلماً غائباً عن الملفات', async () => {
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: async () => ({ data: [], error: null }),
                }),
            }),
        });
        const res = await POST(
            jsonReq({ scope: 'users', userIds: [TARGET], title: 'ت', message: 'نص كافٍ' }),
        );
        expect(res.status).toBe(404);
        expect(notifyMessageMock).not.toHaveBeenCalled();
    });

    it('يرجع 502 إن فشل حفظ الإشعار لكل المستلمين', async () => {
        notifyMessageMock.mockResolvedValue(false);
        const res = await POST(
            jsonReq({ scope: 'users', userIds: [TARGET], title: 'ت', message: 'نص كافٍ' }),
        );
        expect(res.status).toBe(502);
        const body = (await res.json()) as { ok?: boolean; sent?: number; error?: string };
        expect(body.ok).toBe(false);
        expect(body.sent).toBe(0);
        expect(body.error).toContain('تعذّر حفظ');
    });
});
