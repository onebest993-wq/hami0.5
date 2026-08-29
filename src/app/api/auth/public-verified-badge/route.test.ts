import { beforeEach, describe, expect, it, vi } from 'vitest';

const unwrapMock = vi.fn();
const consumeRateMock = vi.fn();
const getClientMock = vi.fn();

vi.mock('../../security/bffAuth.ts', () => ({
    requireWifeUser: vi.fn(),
    unwrapWifeUser: (...a: unknown[]) => unwrapMock(...a),
}));

vi.mock('../../security/wifeRateLimitStore.ts', () => ({
    consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
}));

vi.mock('../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

import { GET } from './route.ts';

const VIEWER = '11111111-2222-4333-8444-555555555555';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('GET /api/auth/public-verified-badge', () => {
    beforeEach(() => {
        unwrapMock.mockReset();
        consumeRateMock.mockReset();
        getClientMock.mockReset();
        unwrapMock.mockReturnValue({ userId: VIEWER });
        consumeRateMock.mockResolvedValue(true);
    });

    it('يرفض بلا معرّف', async () => {
        const res = await GET(new Request('https://app.test/api/auth/public-verified-badge'));
        expect(res.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('يعيد العلامة لزميل دون كشف أعمدة الحساب الأخرى', async () => {
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: async () => ({
                        data: [{ id: TARGET, public_verified_badge: true, is_deleted: false }],
                        error: null,
                    }),
                }),
            }),
        });
        const res = await GET(
            new Request(`https://app.test/api/auth/public-verified-badge?userId=${TARGET}`),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            shown?: boolean;
            badges?: Record<string, boolean>;
            is_deleted?: unknown;
            role?: unknown;
        };
        expect(body.shown).toBe(true);
        expect(body.badges?.[TARGET]).toBe(true);
        expect(body.is_deleted).toBeUndefined();
        expect(body.role).toBeUndefined();
    });

    it('يخفي العلامة عن الحساب المحذوف', async () => {
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: async () => ({
                        data: [{ id: TARGET, public_verified_badge: true, is_deleted: true }],
                        error: null,
                    }),
                }),
            }),
        });
        const res = await GET(
            new Request(`https://app.test/api/auth/public-verified-badge?ids=${TARGET}`),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as { shown?: boolean; badges?: Record<string, boolean> };
        expect(body.shown).toBe(false);
        expect(body.badges?.[TARGET]).toBe(false);
    });
});
