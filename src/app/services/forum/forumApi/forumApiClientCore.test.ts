vi.mock('@/app/services/secureApiNetworkFeatures', () => ({
    canReachProtectedServerNetwork: () => true,
    resolveDeniedNetworkFeatureResponse: () => null,
}));

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/lib/supabase-client', () => ({
    supabase: {
        auth: {
            getSession: vi.fn(async () => ({ data: { session: null } })),
        },
    },
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: null, session: null }),
}));

vi.mock('@/app/utils/bffAuthFlags', () => ({
    isBffAuthEnabled: vi.fn(() => false),
}));

vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: vi.fn(() => null),
}));

import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import { getForumSessionUserId, hasForumRemoteSession } from './forumApiClientCore';

describe('forum BFF session', () => {
    afterEach(() => {
        vi.mocked(isBffAuthEnabled).mockReturnValue(false);
        vi.mocked(getLiveAuthUserId).mockReturnValue(null);
    });

    it('treats a live BFF lawyer as a remote forum session', async () => {
        vi.mocked(isBffAuthEnabled).mockReturnValue(true);
        vi.mocked(getLiveAuthUserId).mockReturnValue('lawyer-real-1');
        expect(await hasForumRemoteSession()).toBe(true);
        expect(await getForumSessionUserId()).toBe('lawyer-real-1');
    });

    it('rejects guest ids even when BFF is on', async () => {
        vi.mocked(isBffAuthEnabled).mockReturnValue(true);
        vi.mocked(getLiveAuthUserId).mockReturnValue('guest-lawyer-1');
        expect(await hasForumRemoteSession()).toBe(false);
        expect(await getForumSessionUserId()).toBeNull();
    });
});
