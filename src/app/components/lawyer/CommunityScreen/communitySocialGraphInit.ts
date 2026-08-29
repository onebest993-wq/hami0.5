import {
    peekForumFollowersCache,
    peekForumFollowingCache,
} from '@/app/services/forum/forumSocialWarmCache';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';

export function resolveInitialSocialGraph(currentUserId: string | null): {
    followingRecords: ForumFollowRecord[];
    followerRecords: Array<{ followerId: string; createdAt: string }>;
} {
    if (!currentUserId) {
        return { followingRecords: [], followerRecords: [] };
    }
    const following = peekForumFollowingCache() ?? [];
    const followers = peekForumFollowersCache() ?? [];
    return { followingRecords: following, followerRecords: followers };
}
