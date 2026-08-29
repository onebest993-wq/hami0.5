import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const kvByKeys = vi.fn(async () => new Map());

vi.mock('../kvStoreAdmin.ts', () => ({
    kvReadUserStatusMapByKeys: (...a: unknown[]) => kvByKeys(...a),
}));

import { EMPTY_HQ_DIRECTORY_QUERY } from '@/app/domain/admin/hqDirectoryQuery';
import { listHeadquartersUsers } from '../headquartersDirectoryList.ts';

const ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function fakeAdmin(rows: Array<Record<string, unknown>>): SupabaseClient {
    const chain = {
        eq() {
            return chain;
        },
        or() {
            return chain;
        },
        gte() {
            return chain;
        },
        in() {
            return chain;
        },
        order() {
            return chain;
        },
        range: async (from: number, to: number) => ({
            data: rows.slice(from, to + 1),
            error: null,
            count: rows.length,
        }),
        then(onFulfilled?: (value: { count: number; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
            return Promise.resolve({ count: rows.length, error: null }).then(onFulfilled, onRejected);
        },
    };
    return {
        from: () => ({
            select: () => chain,
        }),
        rpc: async (name: string) => {
            if (name === 'hq_directory_identities') {
                return {
                    data: [{ id: ID, email: 'a@b.c', family_name: '', phone: '0770', governorate: 'بغداد' }],
                    error: null,
                };
            }
            return { data: null, error: null };
        },
    } as unknown as SupabaseClient;
}

describe('listHeadquartersUsers — صفحة لا دفعة', () => {
    beforeEach(() => {
        kvByKeys.mockClear();
        kvByKeys.mockResolvedValue(new Map([[ID, { status: 'active', kycName: 'علي محمد حسن' }]]));
    });

    it('يعيد صفحة واحدة ويقرأ KV لمفاتيح الصفحة فقط', async () => {
        const listed = await listHeadquartersUsers(fakeAdmin([
            {
                id: ID,
                role: 'lawyer',
                status: 'active',
                created_at: '2026-08-01T00:00:00.000Z',
                legal_display_name: 'علي محمد حسن',
            },
        ]));
        expect(listed.users).toHaveLength(1);
        expect(listed.users[0]?.fullName).toBe('علي محمد حسن');
        expect(listed.users[0]?.email).toBe('a@b.c');
        expect(listed.users[0]?.governorate).toBe('بغداد');
        expect(listed.matched).toBe(1);
        expect(listed.hasMore).toBe(false);
        expect(listed.capped).toBe(false);
        expect(kvByKeys).toHaveBeenCalledWith('lawyer-verification:', [ID]);
    });

    it('لا يطلب كل الحسابات عند الإزاحة', async () => {
        const listed = await listHeadquartersUsers(fakeAdmin([]), {
            ...EMPTY_HQ_DIRECTORY_QUERY,
            offset: 50,
        });
        expect(listed.users).toEqual([]);
        expect(listed.offset).toBe(50);
        expect(listed.matchedExact).toBe(true);
    });
});
