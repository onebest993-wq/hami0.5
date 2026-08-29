import { useCallback } from 'react';
import { persistCommunitySection, type CommunitySection } from '../communitySectionState';
import { useCommunityDualPostLists } from './useCommunityDualPostLists';
import { useCommunityPostsFeed } from './useCommunityPostsFeed';
import { useCommunityGroupsFeed } from './useCommunityGroupsFeed';
import { useCommunityPostActions } from './useCommunityPostActions';
import { useCommunityAddQuestion } from './useCommunityAddQuestion';
import { useCommunityScreenSocialGraph } from './useCommunityScreenSocialGraph';
import { useForumUserStats } from '../useForumUserStats';
import { useMutedUsers } from '../useMutedUsers';
import type { UseCommunityScreenSocialGraphParams } from './useCommunityScreenSocialGraph.types';
import type { useCommunityScreenShell } from './useCommunityScreenShell';

type Shell = ReturnType<typeof useCommunityScreenShell>;

type UseCommunityScreenControllerFeedsArgs = {
    currentUserId: string | null;
    authUser: UseCommunityScreenSocialGraphParams['authUser'];
    persistedUserId: string | null;
    isAdmin: boolean;
    authIsLoading: boolean;
    forumSurfaceOpen: boolean;
    initialPostId: string | null;
    initialOpenComments: boolean;
    shell: Shell;
};

export function useCommunityScreenControllerFeeds({
    currentUserId,
    authUser,
    persistedUserId,
    isAdmin,
    authIsLoading,
    forumSurfaceOpen,
    initialPostId,
    initialOpenComments,
    shell,
}: UseCommunityScreenControllerFeedsArgs) {
    const dualLists = useCommunityDualPostLists();
    const { posts, groupPosts, findPostById, updatePostList } = dualLists;
    const { userStats, bumpFollowerCount, loadUserStats, queueLoadUserStats } = useForumUserStats();
    const { mutedIds, isMuted, toggleMute } = useMutedUsers(currentUserId);

    const socialGraph = useCommunityScreenSocialGraph({
        currentUserId,
        authUser,
        posts,
        showFollowingPanel: shell.showFollowingPanel,
        bumpFollowerCount,
        toggleMute,
        isMuted,
        surfaceOpen: forumSurfaceOpen,
    });

    const groupsFeed = useCommunityGroupsFeed({
        lists: dualLists,
        mutedIds,
        currentUserId,
        authIsLoading,
        activeSection: shell.activeSection,
        surfaceOpen: forumSurfaceOpen,
    });

    const setActiveSection = useCallback(
        (section: CommunitySection) => {
            shell.setActiveSectionState(section);
            persistCommunitySection(section);
            if (section !== 'groups') groupsFeed.clearActiveGroup();
        },
        [groupsFeed.clearActiveGroup, shell.setActiveSectionState],
    );
    const activateForumSection = useCallback(() => {
        setActiveSection('forum');
    }, [setActiveSection]);
    const resetForumFeedAfterPublish = useCallback(() => {
        shell.setForumFeedScope('all');
        shell.setSelectedFilterIndex(0);
    }, [shell.setForumFeedScope, shell.setSelectedFilterIndex]);

    const postsFeed = useCommunityPostsFeed({
        lists: dualLists,
        mutedIds,
        currentUserId,
        followingIds: socialGraph.followingIds,
        forumFeedScope: shell.forumFeedScope,
        selectedFilterIndex: shell.selectedFilterIndex,
        authIsLoading,
        activeSection: shell.activeSection,
        surfaceOpen: forumSurfaceOpen,
        initialPostId,
        initialOpenComments,
        onOpenComments: shell.setCommentingPostId,
        onActivateForumSection: activateForumSection,
    });

    const addQuestion = useCommunityAddQuestion({
        lists: dualLists,
        currentUserId,
        persistedUserId,
        authUser,
        isBanned: socialGraph.isBanned,
        activeGroupId: groupsFeed.activeGroupId,
        appendPublishedGroupPost: groupsFeed.appendPublishedGroupPost,
        onForumPostPublished: resetForumFeedAfterPublish,
    });

    const postActions = useCommunityPostActions({
        lists: dualLists,
        currentUserId,
        isAdmin,
        isBanned: socialGraph.isBanned,
        authUser,
        commentingPostId: shell.commentingPostId,
        onThreadSubscribed: socialGraph.markThreadSubscribed,
        onPostDeleted: (postId) => {
            shell.setCommentingPostId((current) => (current === postId ? null : current));
        },
    });

    return {
        dualLists,
        posts,
        groupPosts,
        findPostById,
        updatePostList,
        userStats,
        loadUserStats,
        queueLoadUserStats,
        mutedIds,
        socialGraph,
        groupsFeed,
        setActiveSection,
        postsFeed,
        addQuestion,
        postActions,
    };
}
