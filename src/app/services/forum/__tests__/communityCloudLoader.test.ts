import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    fetchCommunityPosts,
    prefetchCommunityCloudModule,
    resetCommunityCloudLoaderForTests,
} from '@/app/services/forum/communityCloudLoader';

vi.mock('@/app/services/cloud/lawyerCommunityCloud', () => ({
    CommunityDB: {
        listPosts: vi.fn().mockResolvedValue([{ id: 'post-1', content: 'test' }]),
    },
}));

describe('communityCloudLoader', () => {
    beforeEach(() => {
        resetCommunityCloudLoaderForTests();
        vi.clearAllMocks();
    });

    it('fetchCommunityPosts يُفوّض إلى CommunityDB', async () => {
        const posts = await fetchCommunityPosts();
        expect(posts[0]?.id).toBe('post-1');
    });

    it('prefetchCommunityCloudModule لا يرمي', () => {
        expect(() => prefetchCommunityCloudModule()).not.toThrow();
    });
});
