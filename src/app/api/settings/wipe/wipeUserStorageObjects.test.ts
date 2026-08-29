import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/app/api/upload/uploadStorageUtils', () => ({
    FORUM_MEDIA_BUCKET: 'forum-bucket',
    resolveUploadBucket: () => 'default-bucket',
}));

import { wipeUserStorageObjects } from './wipeUserStorageObjects';

describe('wipeUserStorageObjects', () => {
    it('removes both direct and BFF fallback forum upload paths', async () => {
        const list = vi.fn(async (prefix: string) => {
            if (prefix === 'user-1/images') {
                return { data: [{ id: 'direct', name: 'direct.enc' }], error: null };
            }
            if (prefix === 'user-1/forum-media') {
                return { data: [{ id: 'fallback', name: 'fallback.enc' }], error: null };
            }
            return { data: [], error: null };
        });
        const remove = vi.fn(async (paths: string[]) => ({
            data: paths.map((name) => ({ name })),
            error: null,
        }));
        const from = vi.fn(() => ({ list, remove }));
        const admin = { storage: { from } } as unknown as SupabaseClient;

        const result = await wipeUserStorageObjects(admin, 'user-1');

        expect(remove).toHaveBeenCalledWith([
            'user-1/images/direct.enc',
            'user-1/forum-media/fallback.enc',
        ]);
        expect(result.buckets['forum-bucket']).toBe(2);
        expect(result.deleted).toBe(2);
    });

    it('fails closed on an unexpected storage listing error', async () => {
        const list = vi.fn(async () => ({
            data: null,
            error: { statusCode: 500, message: 'storage unavailable' },
        }));
        const admin = {
            storage: {
                from: () => ({ list, remove: vi.fn() }),
            },
        } as unknown as SupabaseClient;

        await expect(wipeUserStorageObjects(admin, 'user-1')).rejects.toThrow(
            'storage_list_failed',
        );
    });
});
