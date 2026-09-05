vi.mock('@/app/services/settings/collaborationNetworkGate', () => ({
    canReachCollaborationNetwork: () => true,
    COLLABORATION_NETWORK_OFF: 'COLLABORATION_NETWORK_OFF',
    assertCollaborationNetworkReachable: () => undefined,
}));

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
import { getForumSessionUserId, hasForumRemoteSession, shouldPersistMergedForumPosts } from './forumApiClientCore';

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

describe('shouldPersistMergedForumPosts', () => {
    it('يتخطى الكتابة إن البصمة مطابقة', () => {
        const post = {
            id: 'p1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            upvoterIds: [],
            comments: [],
            isPinned: false,
            isLocked: false,
            bestCommentId: null,
        };
        expect(shouldPersistMergedForumPosts([post as never], [post as never])).toBe(false);
    });

    it('يكتب عند تغيّر أفضل تعليق', () => {
        const local = {
            id: 'p1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            upvoterIds: [],
            comments: [],
            isPinned: false,
            isLocked: false,
            bestCommentId: null,
        };
        const merged = { ...local, bestCommentId: 'c1' };
        expect(shouldPersistMergedForumPosts([local as never], [merged as never])).toBe(true);
    });
});
