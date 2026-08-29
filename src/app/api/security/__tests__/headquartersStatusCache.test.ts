import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    HEADQUARTERS_STATUS_CACHE_TTL_MS,
    loadHeadquartersStatusCached,
    resetHeadquartersStatusCacheForTests,
} from '../headquartersStatusCache.ts';
import type { HeadquartersStatusPayload } from '../headquartersStatus.ts';

function payload(usersTotal: number): HeadquartersStatusPayload {
    return {
        system: 'connected',
        db: true,
        kvOk: true,
        pendingVerification: 0,
        verificationApproved: 0,
        verificationRejected: 0,
        pendingReports: 0,
        pendingCommentReports: 0,
        usersTotal,
        usersFrozen: 0,
        usersLocked: 0,
        usersActive: usersTotal,
        usersLawyer: 0,
        usersModerator: 0,
        usersAdmin: 0,
        usersNew24h: 0,
        usersNew7d: 0,
        forumPosts: 0,
        forumComments: 0,
        forumBans: 0,
        forumBansActive: 0,
        forumDocuments: 0,
        forumPinned: 0,
        forumLocked: 0,
        verificationCapped: false,
        contentPartial: false,
        contentGaps: [],
    };
}

describe('loadHeadquartersStatusCached', () => {
    it('يجمع الطلبات داخل نافذة الذاكرة ويتجاوزها عند fresh', async () => {
        resetHeadquartersStatusCacheForTests();
        const load = vi.fn(async () => payload(4));
        const admin = {} as SupabaseClient;
        const first = await loadHeadquartersStatusCached(admin, { load, nowMs: 1_000 });
        const second = await loadHeadquartersStatusCached(admin, { load, nowMs: 1_000 });
        expect(first.usersTotal).toBe(4);
        expect(second.usersTotal).toBe(4);
        expect(load).toHaveBeenCalledTimes(1);

        load.mockResolvedValueOnce(payload(9));
        const fresh = await loadHeadquartersStatusCached(admin, {
            load,
            fresh: true,
            nowMs: 1_000 + HEADQUARTERS_STATUS_CACHE_TTL_MS - 1,
        });
        expect(fresh.usersTotal).toBe(9);
        expect(load).toHaveBeenCalledTimes(2);
    });
});
