import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    peekForumPostsCache,
    resetForumPostsCacheForTests,
    warmForumPostsCache,
} from '@/app/services/forum/forumPostsWarmCache';

vi.mock('@/app/services/auth/lawyerAccountStatus', () => ({
    canUseNetworkFeatures: () => true,
}));
vi.mock('@/app/utils/liveAuthUserId', () => ({
    getLiveAuthUserId: () => 'lawyer-1',
}));
vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: () => ({ user: { id: 'lawyer-1', user_metadata: {} }, session: null }),
}));
vi.mock('@/app/services/forum/communityCloudLoader', () => ({
    fetchCommunityPosts: vi.fn().mockResolvedValue([
        { id: 'p1', groupId: null },
        { id: 'g1', groupId: 'grp-1' },
    ]),
    prefetchCommunityCloudModule: vi.fn(),
}));

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    sortCommunityPosts: (rows: unknown[]) => rows,
}));

describe('forumPostsWarmCache', () => {
    beforeEach(() => {
        resetForumPostsCacheForTests();
        vi.clearAllMocks();
    });

    it('يُحمّي المنشورات بدون groupId', async () => {
        warmForumPostsCache();
        await vi.waitFor(() => expect(peekForumPostsCache()).not.toBeNull(), { timeout: 5_000 });
        expect(peekForumPostsCache()?.map((p) => p.id)).toEqual(['p1']);
    });
});
