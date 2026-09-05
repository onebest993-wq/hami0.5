import { SecureAPIClient, getCurrentAccessToken } from '@/app/services/SecureAPIClient';
import {
    forumApiPostJson,
    getForumSessionUserId,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import { FollowDB } from '@/app/services/forum/forumCommunityRuntime';
import { ForumFollowRepository } from '@/app/services/forum/forumFollowRepository';
import { ForumPostFollowRepository } from '@/app/services/forum/forumPostFollowRepository';

type ApiOk<T> = ForumApiOk<T>;

export async function listForumFollowing(requesterId?: string | null) {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return [];

    const localRecords = await FollowDB.getFollowing(userId);

    if (!(await getCurrentAccessToken())) {
        return localRecords.map((r) => ({
            ...r,
            notifyPosts: true,
            notifyComments: true,
            notifyReplies: true,
        }));
    }

    try {
        const res = await SecureAPIClient.fetchSecure<{
            ok: boolean;
            follows: Array<{
                followerId: string;
                followingId: string;
                createdAt: string;
                notifyPosts: boolean;
                notifyComments: boolean;
                notifyReplies: boolean;
            }>;
        }>('/api/forum/follow?mode=following', { method: 'GET' });
        return Array.isArray(res.follows) ? res.follows : [];
    } catch {
        return localRecords.map((r) => ({
            ...r,
            notifyPosts: true,
            notifyComments: true,
            notifyReplies: true,
        }));
    }
}

export async function followForumUser(
    followingId: string,
    options?: {
        requesterId?: string | null;
        followerName?: string;
        notifyPosts?: boolean;
        notifyComments?: boolean;
        notifyReplies?: boolean;
    },
): Promise<boolean> {
    const userId = await getForumSessionUserId(options?.requesterId);
    if (!userId) throw new Error('يجب تسجيل الدخول');
    if (userId === followingId) throw new Error('لا يمكنك متابعة نفسك');

    await FollowDB.follow(userId, followingId);

    try {
        await forumApiPostJson<ApiOk<{ follow: unknown }>>('/api/forum/follow', {
            action: 'follow',
            followingId,
            followerName: options?.followerName,
            notifyPosts: options?.notifyPosts !== false,
            notifyComments: options?.notifyComments !== false,
            notifyReplies: options?.notifyReplies !== false,
        });
        return true;
    } catch {
        return true;
    }
}

export async function unfollowForumUser(followingId: string, requesterId?: string | null): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('يجب تسجيل الدخول');

    await FollowDB.unfollow(userId, followingId);

    try {
        await forumApiPostJson<ApiOk<Record<string, never>>>('/api/forum/follow', {
            action: 'unfollow',
            followingId,
        });
    } catch {
        /* local fallback ok */
    }
}

export async function updateForumFollowPreferences(
    followingId: string,
    prefs: { notifyPosts?: boolean; notifyComments?: boolean; notifyReplies?: boolean },
    requesterId?: string | null,
): Promise<void> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('يجب تسجيل الدخول');
    await forumApiPostJson<ApiOk<{ follow: unknown }>>('/api/forum/follow', {
        action: 'update_prefs',
        followingId,
        ...prefs,
    });
}

export async function getForumFollowerCount(userId: string): Promise<number> {
    try {
        const res = await SecureAPIClient.fetchSecure<{ ok: boolean; count: number }>(
            `/api/forum/follow?mode=followers&userId=${encodeURIComponent(userId)}`,
            { method: 'GET' },
        );
        if (typeof res.count === 'number') return res.count;
    } catch {
        /* fallback */
    }
    return FollowDB.getFollowerCount(userId);
}

export async function listForumFollowers(targetUserId: string, requesterId?: string | null) {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return [];

    const localRecords = await ForumFollowRepository.getFollowers(targetUserId);
    const mapLocal = () =>
        localRecords.map((r) => ({
            followerId: r.followerId,
            followingId: r.followingId,
            createdAt: r.createdAt,
        }));

    if (!(await getCurrentAccessToken())) {
        return mapLocal();
    }

    try {
        const res = await SecureAPIClient.fetchSecure<{
            ok: boolean;
            follows: Array<{
                followerId: string;
                followingId: string;
                createdAt: string;
            }>;
        }>(`/api/forum/follow?mode=followers&userId=${encodeURIComponent(targetUserId)}`, {
            method: 'GET',
        });
        return Array.isArray(res.follows) && res.follows.length > 0 ? res.follows : mapLocal();
    } catch {
        return mapLocal();
    }
}

export async function listForumPostSubscriptions(requesterId?: string | null): Promise<string[]> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) return [];

    if (!(await getCurrentAccessToken())) {
        return ForumPostFollowRepository.listPostIdsForUser(userId);
    }

    try {
        const res = await SecureAPIClient.fetchSecure<{ ok: boolean; postIds: string[] }>(
            '/api/forum/post-follow',
            { method: 'GET' },
        );
        return Array.isArray(res.postIds) ? res.postIds : [];
    } catch {
        return ForumPostFollowRepository.listPostIdsForUser(userId);
    }
}

export async function toggleForumPostSubscription(
    postId: string,
    requesterId?: string | null,
): Promise<boolean> {
    const userId = await getForumSessionUserId(requesterId);
    if (!userId) throw new Error('يجب تسجيل الدخول');

    const wasSubscribed = await ForumPostFollowRepository.isSubscribed(userId, postId);
    let subscribed: boolean;
    if (wasSubscribed) {
        await ForumPostFollowRepository.unsubscribe(userId, postId);
        subscribed = false;
    } else {
        await ForumPostFollowRepository.subscribe(userId, postId);
        subscribed = true;
    }

    void forumApiPostJson<ApiOk<{ subscribed: boolean }>>('/api/forum/post-follow', {
        postId,
        action: 'toggle',
    }).catch(() => undefined);

    return subscribed;
}
