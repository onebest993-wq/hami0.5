import { useCallback, useEffect, useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { collectForumParticipants } from '@/app/services/forum/forumMentionUtils';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { withForumAsyncTimeout } from '../forumAsync';
import {
    peekForumFollowersCache,
    peekForumFollowingCache,
    readForumSocialCache,
    warmForumSocialCache,
} from '@/app/services/forum/forumSocialWarmCache';

const SOCIAL_FETCH_TIMEOUT_MS = 5_000;
const SOCIAL_CACHE_HYDRATE_MS = 2_000;

function resolveInitialSocialGraph(currentUserId: string | null): {
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

export type UseCommunityScreenSocialGraphParams = {
    currentUserId: string | null;
    authUser: { user_metadata?: { fullName?: string }; email?: string | null } | null;
    posts: CommunityPost[];
    showFollowingPanel: boolean;
    bumpFollowerCount: (userId: string, delta: number) => void;
    toggleMute: (userId: string) => void;
    isMuted: (userId: string) => boolean;
};

export function useCommunityScreenSocialGraph({
    currentUserId,
    authUser,
    posts,
    showFollowingPanel,
    bumpFollowerCount,
    toggleMute,
    isMuted,
}: UseCommunityScreenSocialGraphParams) {
    const initialSocial = resolveInitialSocialGraph(currentUserId);
    const [isBanned, setIsBanned] = useState(false);
    const [followingIds, setFollowingIds] = useState<Set<string>>(
        () => new Set(initialSocial.followingRecords.map((r) => r.followingId)),
    );
    const [followBusyUserId, setFollowBusyUserId] = useState<string | null>(null);
    const [followingRecords, setFollowingRecords] = useState<ForumFollowRecord[]>(initialSocial.followingRecords);
    const [followerRecords, setFollowerRecords] = useState<Array<{ followerId: string; createdAt: string }>>(
        initialSocial.followerRecords,
    );
    const [threadFollowingIds, setThreadFollowingIds] = useState<Set<string>>(new Set());
    const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!currentUserId) {
            setIsBanned(false);
            return;
        }
        void ForumApiService.isUserBanned(currentUserId)
            .then((banned) => setIsBanned(banned))
            .catch(() => setIsBanned(false));
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setFollowingIds(new Set());
            setFollowingRecords([]);
            setFollowerRecords([]);
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            warmForumSocialCache(currentUserId);
            const warmed = await withForumAsyncTimeout(
                readForumSocialCache(currentUserId),
                SOCIAL_CACHE_HYDRATE_MS,
                { following: [], followers: [] },
            );
            if (!cancelled && warmed.following.length > 0) {
                setFollowingRecords(warmed.following);
                setFollowingIds(new Set(warmed.following.map((r) => r.followingId)));
            }
            if (!cancelled && warmed.followers.length > 0) {
                setFollowerRecords(warmed.followers);
            }

            const [following, followers] = await Promise.all([
                withForumAsyncTimeout(ForumApiService.listFollowing(currentUserId), SOCIAL_FETCH_TIMEOUT_MS, []),
                withForumAsyncTimeout(
                    ForumApiService.listFollowers(currentUserId, currentUserId),
                    SOCIAL_FETCH_TIMEOUT_MS,
                    [],
                ),
            ]);

            if (cancelled) return;
            setFollowingRecords(following);
            setFollowingIds(new Set(following.map((r) => r.followingId)));
            setFollowerRecords(
                followers.map((r) => ({ followerId: r.followerId, createdAt: r.createdAt })),
            );
        };

        void bootstrap();
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!showFollowingPanel || !currentUserId) return;
        let cancelled = false;
        void withForumAsyncTimeout(
            ForumApiService.listFollowers(currentUserId, currentUserId),
            SOCIAL_FETCH_TIMEOUT_MS,
            [],
        ).then((rows) => {
            if (!cancelled) {
                setFollowerRecords(rows.map((r) => ({ followerId: r.followerId, createdAt: r.createdAt })));
            }
        });
        return () => {
            cancelled = true;
        };
    }, [showFollowingPanel, currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setThreadFollowingIds(new Set());
            return;
        }
        let cancelled = false;
        void withForumAsyncTimeout(ForumApiService.listPostSubscriptions(currentUserId), SOCIAL_FETCH_TIMEOUT_MS, []).then(
            (ids) => {
                if (!cancelled) setThreadFollowingIds(new Set(ids));
            },
        );
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    useEffect(() => {
        if (!currentUserId) {
            setBookmarkedIds(new Set());
            return;
        }
        let cancelled = false;
        void ForumApiService.listBookmarks(currentUserId).then((ids) => {
            if (!cancelled) setBookmarkedIds(new Set(ids));
        });
        return () => {
            cancelled = true;
        };
    }, [currentUserId]);

    const handleFollow = useCallback(
        async (targetUserId: string) => {
            if (!currentUserId || targetUserId === currentUserId || followBusyUserId === targetUserId) return;
            const isFollowed = followingIds.has(targetUserId);
            const followerName =
                authUser?.user_metadata?.fullName || authUser?.email?.split('@')[0] || 'محامٍ';

            setFollowBusyUserId(targetUserId);
            if (isFollowed) {
                setFollowingIds((prev) => {
                    const n = new Set(prev);
                    n.delete(targetUserId);
                    return n;
                });
                setFollowingRecords((prev) => prev.filter((r) => r.followingId !== targetUserId));
                bumpFollowerCount(targetUserId, -1);
            } else {
                const record: ForumFollowRecord = {
                    followerId: currentUserId,
                    followingId: targetUserId,
                    createdAt: new Date().toISOString(),
                    notifyPosts: true,
                    notifyComments: true,
                    notifyReplies: true,
                };
                setFollowingIds((prev) => new Set(prev).add(targetUserId));
                setFollowingRecords((prev) => [record, ...prev.filter((r) => r.followingId !== targetUserId)]);
                bumpFollowerCount(targetUserId, 1);
            }

            try {
                if (isFollowed) {
                    await ForumApiService.unfollowUser(targetUserId, currentUserId);
                    SmartToast.success('تم إلغاء المتابعة');
                } else {
                    await ForumApiService.followUser(targetUserId, {
                        requesterId: currentUserId,
                        followerName,
                    });
                    SmartToast.success('تمت المتابعة — ستصلك تنبيهات نشاطه');
                }
            } catch {
                if (isFollowed) {
                    setFollowingIds((prev) => new Set(prev).add(targetUserId));
                    setFollowingRecords((prev) => {
                        const record: ForumFollowRecord = {
                            followerId: currentUserId,
                            followingId: targetUserId,
                            createdAt: new Date().toISOString(),
                            notifyPosts: true,
                            notifyComments: true,
                            notifyReplies: true,
                        };
                        return [record, ...prev.filter((r) => r.followingId !== targetUserId)];
                    });
                    bumpFollowerCount(targetUserId, 1);
                } else {
                    setFollowingIds((prev) => {
                        const n = new Set(prev);
                        n.delete(targetUserId);
                        return n;
                    });
                    setFollowingRecords((prev) => prev.filter((r) => r.followingId !== targetUserId));
                    bumpFollowerCount(targetUserId, -1);
                }
                SmartToast.error('تعذّر تحديث حالة المتابعة');
            } finally {
                setFollowBusyUserId(null);
            }
        },
        [authUser, bumpFollowerCount, currentUserId, followBusyUserId, followingIds],
    );

    const handleUpdateFollowPrefs = useCallback(
        async (
            targetUserId: string,
            prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
        ) => {
            if (!currentUserId) return;
            try {
                await ForumApiService.updateFollowPreferences(targetUserId, prefs, currentUserId);
                setFollowingRecords((prev) =>
                    prev.map((r) => (r.followingId === targetUserId ? { ...r, ...prefs } : r)),
                );
                SmartToast.success('تم حفظ تفضيلات التنبيه');
            } catch {
                SmartToast.error('تعذّر حفظ التفضيلات');
            }
        },
        [currentUserId],
    );

    const markThreadSubscribed = useCallback((postId: string) => {
        setThreadFollowingIds((prev) => new Set(prev).add(postId));
    }, []);

    const handleToggleThreadFollow = useCallback(
        async (postId: string) => {
            if (!currentUserId) return;
            const wasFollowing = threadFollowingIds.has(postId);
            setThreadFollowingIds((prev) => {
                const n = new Set(prev);
                if (wasFollowing) n.delete(postId);
                else n.add(postId);
                return n;
            });
            SmartToast.success(wasFollowing ? 'أُلغيت متابعة النقاش' : 'ستصلك تنبيهات هذا النقاش');
            try {
                const next = await ForumApiService.togglePostSubscription(postId, currentUserId);
                setThreadFollowingIds((prev) => {
                    const n = new Set(prev);
                    if (next) n.add(postId);
                    else n.delete(postId);
                    return n;
                });
            } catch {
                setThreadFollowingIds((prev) => {
                    const n = new Set(prev);
                    if (wasFollowing) n.add(postId);
                    else n.delete(postId);
                    return n;
                });
                SmartToast.error('تعذّر تحديث متابعة النقاش');
            }
        },
        [currentUserId, threadFollowingIds],
    );

    const handleMuteUser = useCallback(
        (targetUserId: string) => {
            if (!currentUserId || targetUserId === currentUserId) return;
            toggleMute(targetUserId);
            SmartToast.info(isMuted(targetUserId) ? 'تم إلغاء الكتم' : 'تم كتم المستخدم');
        },
        [currentUserId, isMuted, toggleMute],
    );

    const followingAuthorNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of posts) {
            if (p.authorId && p.authorName) map[p.authorId] = p.authorName;
        }
        for (const row of followingRecords) {
            if (!map[row.followingId]) map[row.followingId] = 'محامٍ';
        }
        for (const row of followerRecords) {
            if (!map[row.followerId]) map[row.followerId] = 'محامٍ';
        }
        return map;
    }, [posts, followingRecords, followerRecords]);

    const forumMentionCandidates = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of posts) {
            for (const part of collectForumParticipants(p)) {
                map.set(part.id, part.name);
            }
        }
        for (const row of followingRecords) {
            const id = row.followingId;
            if (!map.has(id)) map.set(id, followingAuthorNames[id] ?? 'محامٍ');
        }
        if (currentUserId) map.delete(currentUserId);
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }, [posts, followingRecords, followingAuthorNames, currentUserId]);

    return {
        isBanned,
        followingIds,
        followBusyUserId,
        followingRecords,
        followerRecords,
        threadFollowingIds,
        bookmarkedIds,
        setBookmarkedIds,
        handleFollow,
        handleUpdateFollowPrefs,
        markThreadSubscribed,
        handleToggleThreadFollow,
        handleMuteUser,
        followingAuthorNames,
        forumMentionCandidates,
    };
}
