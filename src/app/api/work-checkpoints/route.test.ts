import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, fromMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    fromMock: vi.fn(),
}));

vi.mock('@/app/api/security/bffAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/bffAuth')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
        requireWifeCloudWrite: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/api/security/supabaseAdminClient', () => ({
    getSupabaseAdminClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

vi.mock('@/app/api/security/postgresUuidSubject', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/postgresUuidSubject')>();
    return {
        ...actual,
        rejectNonUuidCloudWrite: () => null,
    };
});

import { GET, POST } from './route';

describe('POST/GET /api/work-checkpoints', () => {
    beforeEach(() => {
        requireWifeUserMock.mockReset();
        fromMock.mockReset();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
    });

    it('يرفض الكتابة بلا جلسة', async () => {
        requireWifeUserMock.mockResolvedValueOnce({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 401 }),
        });
        const res = await POST(
            new Request('https://app.test/api/work-checkpoints', {
                method: 'POST',
                body: JSON.stringify({ encrypted_data: 'x', data_signature: 'y' }),
            }),
        );
        expect(res.status).toBe(401);
        expect(fromMock).not.toHaveBeenCalled();
    });

    it('يخزّن نقطة العمل للمالك فقط', async () => {
        const insert = vi.fn().mockResolvedValue({ error: null });
        const select = vi.fn().mockReturnValue({
            eq: () => ({
                order: () => Promise.resolve({ data: [{ id: '1' }], error: null }),
            }),
        });
        fromMock.mockReturnValue({ insert, select, delete: vi.fn() });

        const res = await POST(
            new Request('https://app.test/api/work-checkpoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encrypted_data: 'cipher', data_signature: 'sig' }),
            }),
        );
        expect(res.status).toBe(200);
        expect(insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                encrypted_data: 'cipher',
                data_signature: 'sig',
            }),
        );
    });

    it('يعيد أحدث نقطة للجلسة', async () => {
        fromMock.mockReturnValue({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => ({
                            maybeSingle: () =>
                                Promise.resolve({
                                    data: {
                                        encrypted_data: 'c',
                                        data_signature: 's',
                                        created_at: '2026-08-29T00:00:00Z',
                                    },
                                    error: null,
                                }),
                        }),
                    }),
                }),
            }),
        });
        const res = await GET(new Request('https://app.test/api/work-checkpoints'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { checkpoint?: { encrypted_data?: string } };
        expect(body.checkpoint?.encrypted_data).toBe('c');
    });

    it('GET لضيف غير UUID يعيد نقطة فارغة بلا استعلام Postgres', async () => {
        requireWifeUserMock.mockResolvedValueOnce({ ok: true, userId: 'guest-lawyer-1' });
        const res = await GET(new Request('https://app.test/api/work-checkpoints'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok?: boolean; checkpoint?: unknown };
        expect(body.ok).toBe(true);
        expect(body.checkpoint).toBeNull();
        expect(fromMock).not.toHaveBeenCalled();
    });
});
