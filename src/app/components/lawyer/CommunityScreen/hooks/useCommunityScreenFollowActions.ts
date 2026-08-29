import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import type { UseCommunityScreenSocialGraphParams } from './useCommunityScreenSocialGraph.types';
import { useCommunityScreenThreadFollow } from './useCommunityScreenThreadFollow';

type UseCommunityScreenFollowActionsParams = Pick<
    UseCommunityScreenSocialGraphParams,
    'currentUserId' | 'authUser' | 'bumpFollowerCount' | 'toggleMute' | 'isMuted'
> & {
    followingIds: Set<string>;
    setFollowingIds: Dispatch<SetStateAction<Set<string>>>;
    setFollowingRecords: Dispatch<SetStateAction<ForumFollowRecord[]>>;
    followingRecordsRef: MutableRefObject<ForumFollowRecord[]>;
    followBusyUserId: string | null;
    setFollowBusyUserId: Dispatch<SetStateAction<string | null>>;
    threadFollowingIds: Set<string>;
    setThreadFollowingIds: Dispatch<SetStateAction<Set<string>>>;
    runInflight: (key: string, action: () => Promise<void>) => Promise<void>;
};

export function useCommunityScreenFollowActions({
    currentUserId,
    authUser,
    bumpFollowerCount,
    toggleMute,
    isMuted,
    followingIds,
    setFollowingIds,
    setFollowingRecords,
    followingRecordsRef,
    followBusyUserId,
    setFollowBusyUserId,
    threadFollowingIds,
    setThreadFollowingIds,
    runInflight,
}: UseCommunityScreenFollowActionsParams) {
    const { markThreadSubscribed, handleToggleThreadFollow } = useCommunityScreenThreadFollow({
        currentUserId,
        threadFollowingIds,
        setThreadFollowingIds,
        runInflight,
    });

    const handleFollow = useCallback(
        async (targetUserId: string) => {
            if (!currentUserId || targetUserId === currentUserId || followBusyUserId === targetUserId) return;
            const isFollowed = followingIds.has(targetUserId);
            const snapshotRecord = followingRecordsRef.current.find((r) => r.followingId === targetUserId);
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
                        const restored: ForumFollowRecord = snapshotRecord ?? {
                            followerId: currentUserId,
                            followingId: targetUserId,
                            createdAt: new Date().toISOString(),
                            notifyPosts: true,
                            notifyComments: true,
                            notifyReplies: true,
                        };
                        return [restored, ...prev.filter((r) => r.followingId !== targetUserId)];
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
        [
            authUser,
            bumpFollowerCount,
            currentUserId,
            followBusyUserId,
            followingIds,
            followingRecordsRef,
            setFollowBusyUserId,
            setFollowingIds,
            setFollowingRecords,
        ],
    );

    const handleUpdateFollowPrefs = useCallback(
        async (
            targetUserId: string,
            prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
        ) => {
            if (!currentUserId) return;
            await runInflight(`prefs:${targetUserId}`, async () => {
                const snapshot = followingRecordsRef.current;
                setFollowingRecords((prev) =>
                    prev.map((r) => (r.followingId === targetUserId ? { ...r, ...prefs } : r)),
                );
                try {
                    await ForumApiService.updateFollowPreferences(targetUserId, prefs, currentUserId);
                    SmartToast.success('تم حفظ تفضيلات التنبيه');
                } catch {
                    setFollowingRecords(snapshot);
                    SmartToast.error('تعذّر حفظ التفضيلات');
                }
            });
        },
        [currentUserId, followingRecordsRef, runInflight, setFollowingRecords],
    );

    const handleMuteUser = useCallback(
        (targetUserId: string) => {
            if (!currentUserId || targetUserId === currentUserId) return;
            toggleMute(targetUserId);
            SmartToast.info(isMuted(targetUserId) ? 'تم إلغاء الكتم' : 'تم كتم المستخدم');
        },
        [currentUserId, isMuted, toggleMute],
    );

    return {
        handleFollow,
        handleUpdateFollowPrefs,
        markThreadSubscribed,
        handleToggleThreadFollow,
        handleMuteUser,
    };
}
