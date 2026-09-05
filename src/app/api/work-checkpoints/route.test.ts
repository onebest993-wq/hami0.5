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
                keep_anchor: false,
            }),
        );
    });

    it('يخزّن keep_anchor عند اكتمال الحزمة', async () => {
        const insert = vi.fn().mockResolvedValue({ error: null });
        const select = vi.fn().mockReturnValue({
            eq: () => ({
                order: () => Promise.resolve({ data: [{ id: '1', keep_anchor: true }], error: null }),
            }),
        });
        fromMock.mockReturnValue({ insert, select, delete: vi.fn() });

        const res = await POST(
            new Request('https://app.test/api/work-checkpoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    encrypted_data: 'cipher',
                    data_signature: 'sig',
                    keep_anchor: true,
                }),
            }),
        );
        expect(res.status).toBe(200);
        expect(insert).toHaveBeenCalledWith(expect.objectContaining({ keep_anchor: true }));
    });
    it('يعيد أحدث نقطة للجلسة ومعها تاريخ الصفوف المشفّرة', async () => {
        const rows = [
            {
                id: 'n1',
                encrypted_data: 'c-new',
                data_signature: 's-new',
                created_at: '2026-08-30T00:00:00Z',
                keep_anchor: false,
            },
            {
                id: 'n2',
                encrypted_data: 'c-old',
                data_signature: 's-old',
                created_at: '2026-08-29T00:00:00Z',
                keep_anchor: true,
            },
        ];
        const chain = {
            eq: () => chain,
            order: () => chain,
            limit: () => Promise.resolve({ data: rows, error: null }),
        };
        fromMock.mockReturnValue({ select: () => chain });
        const res = await GET(new Request('https://app.test/api/work-checkpoints'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            checkpoint?: { encrypted_data?: string };
            checkpoints?: Array<{ encrypted_data?: string }>;
        };
        expect(body.checkpoint?.encrypted_data).toBe('c-new');
        expect(body.checkpoints?.map((row) => row.encrypted_data)).toEqual(['c-new', 'c-old']);
    });

    it('GET يضم صف keep_anchor الأقدم خارج نافذة الـ 3', async () => {
        const latest = [
            {
                id: 's1',
                encrypted_data: 'stripped-1',
                data_signature: 'a',
                created_at: '2026-08-30T12:00:00Z',
                keep_anchor: false,
            },
            {
                id: 's2',
                encrypted_data: 'stripped-2',
                data_signature: 'b',
                created_at: '2026-08-30T11:00:00Z',
                keep_anchor: false,
            },
            {
                id: 's3',
                encrypted_data: 'stripped-3',
                data_signature: 'c',
                created_at: '2026-08-30T10:00:00Z',
                keep_anchor: false,
            },
        ];
        const anchor = [
            {
                id: 'complete',
                encrypted_data: 'full-cal',
                data_signature: 'd',
                created_at: '2026-08-01T00:00:00Z',
                keep_anchor: true,
            },
        ];
        let selectCalls = 0;
        fromMock.mockImplementation(() => ({
            select: () => {
                selectCalls += 1;
                const data = selectCalls === 1 ? latest : anchor;
                const chain = {
                    eq: () => chain,
                    order: () => chain,
                    limit: () => Promise.resolve({ data, error: null }),
                };
                return chain;
            },
        }));
        const res = await GET(new Request('https://app.test/api/work-checkpoints'));
        const body = (await res.json()) as { checkpoints?: Array<{ encrypted_data?: string }> };
        expect(body.checkpoints?.map((row) => row.encrypted_data)).toEqual([
            'stripped-1',
            'stripped-2',
            'stripped-3',
            'full-cal',
        ]);
    });

    it('GET لضيف غير UUID يعيد نقطة فارغة بلا استعلام Postgres', async () => {
        requireWifeUserMock.mockResolvedValueOnce({ ok: true, userId: 'guest-lawyer-1' });
        const res = await GET(new Request('https://app.test/api/work-checkpoints'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok?: boolean; checkpoint?: unknown };
        expect(body.ok).toBe(true);
        expect(body.checkpoint).toBeNull();
        expect((body as { checkpoints?: unknown[] }).checkpoints).toEqual([]);
        expect(fromMock).not.toHaveBeenCalled();
    });
});
