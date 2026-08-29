import { describe, expect, it, vi } from 'vitest';

const inMock = vi.fn();

vi.mock('../supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({
        from: () => ({
            select: () => ({
                in: (...args: unknown[]) => inMock(...args),
            }),
        }),
    }),
}));

import { kvReadUserStatusMapByKeys } from '../kvStoreAdmin.ts';

describe('kvReadUserStatusMapByKeys', () => {
    it('يجلب مفاتيح الصفحة فقط', async () => {
        const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        inMock.mockResolvedValueOnce({
            data: [
                {
                    key: `lawyer-verification:${id}`,
                    status: 'pending',
                    fullName: 'وجدان علي',
                },
            ],
            error: null,
        });
        const map = await kvReadUserStatusMapByKeys('lawyer-verification:', [id, id]);
        expect(inMock).toHaveBeenCalledWith('key', [`lawyer-verification:${id}`]);
        expect(map.get(id)).toEqual({ status: 'pending', kycName: 'وجدان علي' });
    });
});
