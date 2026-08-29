import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { HAMI_PLATFORM_ADMIN_UUID } from '../roleResolver.ts';
import { listHeadquartersNotifyRecipientIds } from '../headquartersUsers.ts';

const LAWYER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const ADMIN_ROLE = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';

function fakeAdmin(rows: Array<{ id: string; role: string }>, error: { message: string } | null = null) {
    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    range: async (from: number, to: number) => ({
                        data: error ? null : rows.slice(from, to + 1),
                        error,
                    }),
                    limit: async () => ({ data: error ? null : rows, error }),
                }),
            }),
        }),
    } as unknown as SupabaseClient;
}

describe('listHeadquartersNotifyRecipientIds', () => {
    it('يستبعد UUID المنصّة وأي دور إدارة', async () => {
        const listed = await listHeadquartersNotifyRecipientIds(
            fakeAdmin([
                { id: HAMI_PLATFORM_ADMIN_UUID, role: 'lawyer' },
                { id: ADMIN_ROLE, role: 'admin' },
                { id: LAWYER, role: 'lawyer' },
            ]),
        );
        expect(listed.ids).toEqual([LAWYER]);
        expect(listed.capped).toBe(false);
    });

    it('يرمي إن فشل الاستعلام', async () => {
        await expect(
            listHeadquartersNotifyRecipientIds(fakeAdmin([], { message: 'db down' })),
        ).rejects.toThrow(/db down|Failed to list notify recipients/);
    });
});
