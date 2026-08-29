import { useEffect, useMemo } from 'react';
import { useForumLifecycle } from './useForumLifecycle';
import { warmForumSocialForUser } from '@/app/hooks/lawyerDashboard/forumIntentWarm';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';
import { useCommunityScreenForumEscape } from './useCommunityScreenForumEscape';
import { useCommunityForumAccess } from './useCommunityForumAccess';
import { useForumPostCommentsLive } from './useForumPostCommentsLive';
import { useCommunityScreenSearchOverlay } from './useCommunityScreenSearchOverlay';
import { useCommunityScreenPostModeration } from './useCommunityScreenPostModeration';
import { useCommunityScreenShell } from './useCommunityScreenShell';
import { useCommunityScreenInteractions } from './useCommunityScreenInteractions';
import { useCommunityScreenKeepAliveDismiss } from './useCommunityScreenKeepAliveDismiss';
import { useCommunityScreenPropModel } from './useCommunityScreenPropModel';
import { assembleCommunityScreenPropContext } from './assembleCommunityScreenPropContext';
import { useCommunityScreenControllerFeeds } from './useCommunityScreenControllerFeeds';

export type CommunityScreenControllerProps = {
    isOpen?: boolean;
    keepAlive?: boolean;
    onBack?: () => void;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    lawyerShellAccess?: boolean;
    fallbackUserId?: string | null;
    onOpenOwnProfile?: () => void;
};

export function useCommunityScreenController({
    isOpen = true,
    onBack,
    initialPostId = null,
    initialOpenComments = false,
    lawyerShellAccess = false,
    fallbackUserId = null,
    onOpenOwnProfile,
}: CommunityScreenControllerProps) {
    const forumSurfaceOpen = isOpen !== false;
    const {
        authUser,
        authIsLoading,
        persistedUser,
        canAccessLawyerForum,
        forumDenial,
        currentUserId,
        showLoadingShell,
        isAdmin,
        accountFrozen,
        frozenMessage,
    } =
        useCommunityForumAccess({ lawyerShellAccess, fallbackUserId });
    useBodyScrollLock(Boolean(onBack) && forumSurfaceOpen);
    const forumNetworkLive =
        forumSurfaceOpen && canAccessLawyerForum && !accountFrozen;
    const forumStreamConnected = useForumNotificationStream(
        currentUserId,
        forumNetworkLive && Boolean(currentUserId),
    );
    useEffect(() => {
        if (!forumNetworkLive) return;
        warmForumSocialForUser(currentUserId);
    }, [currentUserId, forumNetworkLive]);

    const shell = useCommunityScreenShell();
    const feeds = useCommunityScreenControllerFeeds({
        currentUserId,
        authUser,
        persistedUserId: persistedUser?.id ?? null,
        isAdmin,
        authIsLoading,
        forumSurfaceOpen: forumNetworkLive,
        initialPostId,
        initialOpenComments,
        shell,
    });

    useForumPostCommentsLive({
        postId: shell.commentingPostId,
        enabled: forumNetworkLive && Boolean(shell.commentingPostId),
        onPostUpdate: (postId, updater) => {
            feeds.updatePostList(postId, (prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
        },
    });

    const searchOverlay = useCommunityScreenSearchOverlay(feeds.posts, feeds.postsFeed.allTags);
    const postModeration = useCommunityScreenPostModeration({
        currentUserId,
        isAdmin,
        authUser,
        persistedUser,
        findPostById: (postId) => feeds.findPostById(postId) ?? undefined,
        updatePostList: feeds.updatePostList,
        bookmarkedIds: feeds.socialGraph.bookmarkedIds,
        setBookmarkedIds: feeds.socialGraph.setBookmarkedIds,
    });

    const interactions = useCommunityScreenInteractions({
        forumSurfaceOpen,
        currentUserId,
        onOpenOwnProfile,
        loadUserStats: feeds.loadUserStats,
        queueLoadUserStats: feeds.queueLoadUserStats,
        setProfileView: shell.setProfileView,
        setActiveSection: feeds.setActiveSection,
        setRepositorySearchTerm: shell.setRepositorySearchTerm,
        closeSearchOverlay: searchOverlay.closeSearchOverlay,
        setCommentingPostId: shell.setCommentingPostId,
        activeSection: shell.activeSection,
        activeGroupId: feeds.groupsFeed.activeGroupId,
        groupVisiblePosts: feeds.groupsFeed.groupVisiblePosts,
        visiblePosts: feeds.postsFeed.visiblePosts,
    });

    const activePostForComments = useMemo(() => {
        if (!shell.commentingPostId) return null;
        return feeds.findPostById(shell.commentingPostId);
    }, [shell.commentingPostId, feeds.posts, feeds.groupPosts, feeds.findPostById]);

    const { popForumLayer } = useCommunityScreenForumEscape({
        forumSurfaceOpen,
        onBack,
        shell,
        postActions: feeds.postActions,
        postModeration,
        groupsFeed: feeds.groupsFeed,
        addQuestion: feeds.addQuestion,
        searchOverlay,
        interactions,
    });

    useForumLifecycle(
        currentUserId,
        feeds.postsFeed.loadingPosts,
        feeds.postsFeed.visiblePosts.length,
        forumNetworkLive,
    );

    useCommunityScreenKeepAliveDismiss({
        forumSurfaceOpen,
        deletingPost: feeds.postActions.deletingPost,
        cancelDeletePostRequest: feeds.postActions.cancelDeletePostRequest,
        savingEdit: postModeration.savingEdit,
        setEditingPostId: postModeration.setEditingPostId,
        setEditingText: postModeration.setEditingText,
        submittingGroup: feeds.groupsFeed.submittingGroup,
        setIsCreateGroupOpen: feeds.groupsFeed.setIsCreateGroupOpen,
        setCommentingPostId: shell.setCommentingPostId,
        closeAddQuestion: feeds.addQuestion.closeAddQuestion,
        closeSearchOverlay: searchOverlay.closeSearchOverlay,
        setShowFollowingPanel: shell.setShowFollowingPanel,
        closeAppBarDropdownsRef: shell.closeAppBarDropdownsRef,
        setForumAppBarDropdownOpen: shell.setForumAppBarDropdownOpen,
        setProfileView: shell.setProfileView,
    });

    const { bodyProps, overlayProps } = useCommunityScreenPropModel(
        assembleCommunityScreenPropContext({
            popForumLayer,
            forumSurfaceOpen,
            currentUserId,
            isAdmin,
            forumStreamConnected,
            userStats: feeds.userStats,
            mutedIds: feeds.mutedIds,
            activePostForComments,
            setActiveSection: feeds.setActiveSection,
            shell,
            socialGraph: feeds.socialGraph,
            groupsFeed: feeds.groupsFeed,
            postsFeed: feeds.postsFeed,
            searchOverlay,
            addQuestion: feeds.addQuestion,
            postActions: feeds.postActions,
            postModeration,
            interactions,
        }),
    );
    const gateBlocked = showLoadingShell || !canAccessLawyerForum || accountFrozen;

    return {
        gateBlocked,
        accessGateProps: {
            showLoadingShell,
            canAccessLawyerForum,
            accountFrozen,
            frozenMessage,
            forumDenial,
        },
        bodyProps,
        overlayProps,
    };
}
