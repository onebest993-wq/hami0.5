import { useMemo } from 'react';
import { collectForumParticipants } from '@/app/services/forum/forumMentionUtils';
import { useForumInflightGuard } from './useForumInflightGuard';
import { useCommunityScreenFollowActions } from './useCommunityScreenFollowActions';
import { useCommunityScreenSocialBootstrap } from './useCommunityScreenSocialBootstrap';
import type { UseCommunityScreenSocialGraphParams } from './useCommunityScreenSocialGraph.types';

export type { UseCommunityScreenSocialGraphParams } from './useCommunityScreenSocialGraph.types';

export function useCommunityScreenSocialGraph({
    currentUserId,
    authUser,
    posts,
    showFollowingPanel,
    bumpFollowerCount,
    toggleMute,
    isMuted,
    surfaceOpen = true,
}: UseCommunityScreenSocialGraphParams) {
    const bootstrap = useCommunityScreenSocialBootstrap(
        currentUserId,
        showFollowingPanel,
        surfaceOpen,
    );
    const { runInflight } = useForumInflightGuard();
    const actions = useCommunityScreenFollowActions({
        currentUserId,
        authUser,
        bumpFollowerCount,
        toggleMute,
        isMuted,
        followingIds: bootstrap.followingIds,
        setFollowingIds: bootstrap.setFollowingIds,
        setFollowingRecords: bootstrap.setFollowingRecords,
        followingRecordsRef: bootstrap.followingRecordsRef,
        followBusyUserId: bootstrap.followBusyUserId,
        setFollowBusyUserId: bootstrap.setFollowBusyUserId,
        threadFollowingIds: bootstrap.threadFollowingIds,
        setThreadFollowingIds: bootstrap.setThreadFollowingIds,
        runInflight,
    });

    const followingAuthorNames = useMemo(() => {
        const map: Record<string, string> = {};
        for (const p of posts) {
            if (p.authorId && p.authorName) map[p.authorId] = p.authorName;
        }
        for (const row of bootstrap.followingRecords) {
            if (!map[row.followingId]) map[row.followingId] = 'محامٍ';
        }
        for (const row of bootstrap.followerRecords) {
            if (!map[row.followerId]) map[row.followerId] = 'محامٍ';
        }
        return map;
    }, [posts, bootstrap.followingRecords, bootstrap.followerRecords]);

    const forumMentionCandidates = useMemo(() => {
        const map = new Map<string, string>();
        for (const p of posts) {
            for (const part of collectForumParticipants(p)) {
                map.set(part.id, part.name);
            }
        }
        for (const row of bootstrap.followingRecords) {
            const id = row.followingId;
            if (!map.has(id)) map.set(id, followingAuthorNames[id] ?? 'محامٍ');
        }
        if (currentUserId) map.delete(currentUserId);
        return [...map.entries()].map(([id, name]) => ({ id, name }));
    }, [posts, bootstrap.followingRecords, followingAuthorNames, currentUserId]);

    return {
        isBanned: bootstrap.isBanned,
        followingIds: bootstrap.followingIds,
        followBusyUserId: bootstrap.followBusyUserId,
        followingRecords: bootstrap.followingRecords,
        followerRecords: bootstrap.followerRecords,
        threadFollowingIds: bootstrap.threadFollowingIds,
        bookmarkedIds: bootstrap.bookmarkedIds,
        setBookmarkedIds: bootstrap.setBookmarkedIds,
        handleFollow: actions.handleFollow,
        handleUpdateFollowPrefs: actions.handleUpdateFollowPrefs,
        markThreadSubscribed: actions.markThreadSubscribed,
        handleToggleThreadFollow: actions.handleToggleThreadFollow,
        handleMuteUser: actions.handleMuteUser,
        followingAuthorNames,
        forumMentionCandidates,
    };
}
