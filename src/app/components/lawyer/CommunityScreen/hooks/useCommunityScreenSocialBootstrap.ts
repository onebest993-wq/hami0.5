import { useCommunityScreenSocialFlags } from './useCommunityScreenSocialFlags';
import { useCommunityScreenSocialLists } from './useCommunityScreenSocialLists';

export function useCommunityScreenSocialBootstrap(
    currentUserId: string | null,
    showFollowingPanel: boolean,
    surfaceOpen = true,
) {
    const lists = useCommunityScreenSocialLists(currentUserId, showFollowingPanel, surfaceOpen);
    const flags = useCommunityScreenSocialFlags(currentUserId, surfaceOpen);

    return {
        isBanned: flags.isBanned,
        followingIds: lists.followingIds,
        setFollowingIds: lists.setFollowingIds,
        followBusyUserId: lists.followBusyUserId,
        setFollowBusyUserId: lists.setFollowBusyUserId,
        followingRecords: lists.followingRecords,
        setFollowingRecords: lists.setFollowingRecords,
        followerRecords: lists.followerRecords,
        threadFollowingIds: flags.threadFollowingIds,
        setThreadFollowingIds: flags.setThreadFollowingIds,
        bookmarkedIds: flags.bookmarkedIds,
        setBookmarkedIds: flags.setBookmarkedIds,
        followingRecordsRef: lists.followingRecordsRef,
    };
}
