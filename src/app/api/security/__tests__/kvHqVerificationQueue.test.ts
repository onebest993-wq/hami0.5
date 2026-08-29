import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rangeMock } = vi.hoisted(() => ({
    rangeMock: vi.fn(),
}));

vi.mock('../supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({
        from: () => ({
            select: () => ({
                like: () => ({
                    order: () => ({
                        range: (...args: unknown[]) => rangeMock(...args),
                    }),
                }),
            }),
        }),
    }),
}));

import { kvReadHqVerificationQueueByPrefix } from '../kvStoreAdmin.ts';

describe('kvReadHqVerificationQueueByPrefix', () => {
    beforeEach(() => {
        rangeMock.mockReset();
    });

    it('يستخرج userId من المفتاح ويتجاهل صفوفاً بلا هوية مفتاح', async () => {
        rangeMock.mockResolvedValue({
            data: [
                {
                    key: 'lawyer-verification:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                    userId: 'spoofed-other-id',
                    status: 'pending',
                    fullName: 'وجدان',
                    hasIdFront: 'true',
                    hasIdBack: 'false',
                },
                { key: 'other-prefix:skip', status: 'pending' },
            ],
            error: null,
        });
        const { rows, capped } = await kvReadHqVerificationQueueByPrefix('lawyer-verification:');
        expect(capped).toBe(false);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.userId).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        expect(rows[0]?.fullName).toBe('وجدان');
        expect(rows[0]?.hasIdFront).toBe('true');
        expect(JSON.stringify(rows)).not.toContain('data:image');
    });

    it('يرتب المعلّق الأقدم أولاً', async () => {
        rangeMock.mockResolvedValue({
            data: [
                {
                    key: 'lawyer-verification:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee2',
                    status: 'pending',
                    submittedAt: '2026-08-20T00:00:00.000Z',
                },
                {
                    key: 'lawyer-verification:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee1',
                    status: 'pending',
                    submittedAt: '2026-08-10T00:00:00.000Z',
                },
                {
                    key: 'lawyer-verification:aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeee3',
                    status: 'active',
                    submittedAt: '2026-08-01T00:00:00.000Z',
                },
            ],
            error: null,
        });
        const { rows } = await kvReadHqVerificationQueueByPrefix('lawyer-verification:');
        expect(rows.map((row) => row.userId.slice(-1))).toEqual(['1', '2', '3']);
    });
});
