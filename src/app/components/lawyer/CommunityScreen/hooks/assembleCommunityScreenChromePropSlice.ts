import type { CommunityScreenChromePropSlice } from './communityScreenPropBuilderContext';
import type { AssembleCommunityScreenPropContextParams } from './assembleCommunityScreenPropContext.types';

export function assembleCommunityScreenChromePropSlice(
    params: AssembleCommunityScreenPropContextParams,
): CommunityScreenChromePropSlice {
    const { popForumLayer, forumSurfaceOpen, currentUserId, forumStreamConnected, setActiveSection, shell, socialGraph, searchOverlay, interactions } =
        params;
    return {
        onBack: popForumLayer,
        forumSurfaceOpen,
        activeSection: shell.activeSection,
        setActiveSection,
        setIsSearchOpen: searchOverlay.setIsSearchOpen,
        openSearchOverlay: searchOverlay.openSearchOverlay,
        closeSearchOverlay: searchOverlay.closeSearchOverlay,
        handleNavigateToPost: interactions.handleNavigateToPost,
        currentUserId,
        isBanned: socialGraph.isBanned,
        selectedFilterIndex: shell.selectedFilterIndex,
        setSelectedFilterIndex: shell.setSelectedFilterIndex,
        repositorySearchTerm: shell.repositorySearchTerm,
        setRepositorySearchTerm: shell.setRepositorySearchTerm,
        repositorySortBy: shell.repositorySortBy,
        setRepositorySortBy: shell.setRepositorySortBy,
        repositorySelectedType: shell.repositorySelectedType,
        setRepositorySelectedType: shell.setRepositorySelectedType,
        repositorySelectedTag: shell.repositorySelectedTag,
        setRepositorySelectedTag: shell.setRepositorySelectedTag,
        followingRecords: socialGraph.followingRecords,
        setShowFollowingPanel: shell.setShowFollowingPanel,
        forumFeedScope: shell.forumFeedScope,
        setForumFeedScope: shell.setForumFeedScope,
        forumStreamConnected,
        setForumAppBarDropdownOpen: shell.setForumAppBarDropdownOpen,
        closeAppBarDropdownsRef: shell.closeAppBarDropdownsRef,
        showFollowingPanel: shell.showFollowingPanel,
        followerRecords: socialGraph.followerRecords,
        followingAuthorNames: socialGraph.followingAuthorNames,
        handleFollow: socialGraph.handleFollow,
        handleUpdateFollowPrefs: socialGraph.handleUpdateFollowPrefs,
        openForumProfile: interactions.openForumProfile,
    };
}
