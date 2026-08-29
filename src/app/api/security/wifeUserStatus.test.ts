// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

vi.mock('./supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({
        from: (table: string) => {
            const result = tableResponses[table] ?? { data: null, error: { message: 'missing' } };
            return {
                select: () => ({
                    or: () => ({ limit: () => ({ maybeSingle: async () => result }) }),
                    eq: () => ({ limit: () => ({ maybeSingle: async () => result }) }),
                }),
                insert: vi.fn(async () => ({ error: null })),
                update: () => ({ eq: vi.fn(async () => ({ error: null })) }),
            };
        },
    }),
}));

import {
    getWifeUserRestrictionLive,
    isUserActiveLive,
    isUserFrozenLive,
    resetWifeUserStatusCacheForTests,
} from './wifeUserStatus.ts';

describe('isUserActiveLive', () => {
    beforeEach(() => {
        resetWifeUserStatusCacheForTests();
        process.env.NODE_ENV = 'production';
        for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    });

    afterEach(() => {
        process.env.NODE_ENV = 'test';
        resetWifeUserStatusCacheForTests();
    });

    it('allows frozen profiles to keep login while marking network freeze', async () => {
        tableResponses.profiles = {
            data: { id: 'u1', is_banned: true, is_active: false, status: 'suspended' },
            error: null,
        };
        expect(await isUserActiveLive('u1')).toBe(true);
        resetWifeUserStatusCacheForTests();
        expect(await isUserFrozenLive('u1')).toBe(true);
    });

    it('allows a verified profile', async () => {
        tableResponses.profiles = {
            data: { id: 'u2', is_banned: false, is_active: true, status: 'active' },
            error: null,
        };
        expect(await isUserActiveLive('u2')).toBe(true);
    });

    it('keeps login during an active timed freeze and marks the account frozen', async () => {
        tableResponses.profiles = {
            data: {
                id: 'u-freeze',
                is_banned: true,
                is_active: false,
                status: 'suspended',
                freeze_until: new Date(Date.now() + 60_000).toISOString(),
            },
            error: null,
        };
        expect(await isUserActiveLive('u-freeze')).toBe(true);
        resetWifeUserStatusCacheForTests();
        expect(await isUserFrozenLive('u-freeze')).toBe(true);
    });

    it('allows login after timed freeze expiry', async () => {
        tableResponses.profiles = {
            data: {
                id: 'u-expired',
                is_banned: true,
                is_active: false,
                status: 'suspended',
                freeze_until: new Date(Date.now() - 60_000).toISOString(),
            },
            error: null,
        };
        expect(await isUserActiveLive('u-expired')).toBe(true);
        resetWifeUserStatusCacheForTests();
        expect(await isUserFrozenLive('u-expired')).toBe(false);
    });

    it('does not fail-closed in production when profiles is absent and lawyers table is missing', async () => {
        tableResponses.profiles = { data: null, error: null };
        tableResponses.lawyers = { data: null, error: { message: 'relation does not exist' } };
        expect(await isUserActiveLive('new-lawyer')).toBe(true);
    });

    it('fail-closes in production when profiles cannot be queried', async () => {
        tableResponses.profiles = { data: null, error: { message: 'timeout' } };
        expect(await isUserActiveLive('u3')).toBe(false);
    });

    it('fail-closes injected user ids before querying PostgREST', async () => {
        tableResponses.profiles = {
            data: { id: 'should-not-read', is_banned: false, is_active: true },
            error: null,
        };
        expect(await isUserActiveLive('u1,id.eq.other')).toBe(false);
    });

    it('blocks login when login_blocked is set', async () => {
        tableResponses.profiles = {
            data: { id: 'u-lock', is_banned: false, is_active: true, status: 'active', login_blocked: true },
            error: null,
        };
        expect(await isUserActiveLive('u-lock')).toBe(false);
        resetWifeUserStatusCacheForTests();
        expect(await isUserFrozenLive('u-lock')).toBe(false);
    });

    it('blocks login for soft-deleted profiles', async () => {
        tableResponses.profiles = {
            data: { id: 'u-del', is_deleted: true, is_active: true, status: 'active' },
            error: null,
        };
        expect(await isUserActiveLive('u-del')).toBe(false);
        resetWifeUserStatusCacheForTests();
        expect(await getWifeUserRestrictionLive('u-del')).toEqual({
            loginAllowed: false,
            frozen: false,
            freezeUntil: null,
            loginUntil: null,
            deleted: true,
        });
    });
});
