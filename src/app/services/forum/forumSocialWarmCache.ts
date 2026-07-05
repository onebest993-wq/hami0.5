import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';
import { ForumApiService } from '@/app/services/forumApiService';

export type ForumFollowerRow = { followerId: string; createdAt: string };

let warmedFollowing: ForumFollowRecord[] | null = null;
let warmedFollowers: ForumFollowerRow[] | null = null;
let warmPromise: Promise<void> | null = null;
let warmedUserId: string | null = null;

export function warmForumSocialCache(userId: string): void {
    if (!userId) return;
    if (warmPromise && warmedUserId === userId) return;
    warmedUserId = userId;
    warmPromise = withForumAsyncTimeout(
        Promise.all([
            ForumApiService.listFollowing(userId),
            ForumApiService.listFollowers(userId, userId),
        ]).then(([following, followers]) => {
            warmedFollowing = following;
            warmedFollowers = followers.map((r) => ({
                followerId: r.followerId,
                createdAt: r.createdAt,
            }));
        }),
        4_000,
        undefined,
    ).catch(() => undefined);
}

export function peekForumFollowingCache(): ForumFollowRecord[] | null {
    return warmedFollowing;
}

export function peekForumFollowersCache(): ForumFollowerRow[] | null {
    return warmedFollowers;
}

export async function readForumSocialCache(userId: string): Promise<{
    following: ForumFollowRecord[];
    followers: ForumFollowerRow[];
}> {
    warmForumSocialCache(userId);
    if (warmPromise) await warmPromise;
    return {
        following: warmedFollowing ?? [],
        followers: warmedFollowers ?? [],
    };
}

export function resetForumSocialCacheForTests(): void {
    warmedFollowing = null;
    warmedFollowers = null;
    warmPromise = null;
    warmedUserId = null;
}
