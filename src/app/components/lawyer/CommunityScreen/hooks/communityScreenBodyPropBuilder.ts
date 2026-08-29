import { flushSync } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { CommunityScreenBodyProps } from '../components/CommunityScreenBody.types';
import { openForumAddQuestionGuard } from '../forumAddQuestionGuard';
import { prefetchCommunitySearchOverlay } from '../communityOverlayPrefetch';
import type { CommunityScreenPropBuilderContext } from './communityScreenPropBuilderContext';

export function buildCommunityScreenBodyProps(
    ctx: CommunityScreenPropBuilderContext,
): CommunityScreenBodyProps {
    return {
        onBack: ctx.onBack,
        forumSurfaceOpen: ctx.forumSurfaceOpen,
        activeSection: ctx.activeSection,
        onSectionChange: ctx.setActiveSection,
        onSearchOpen: () => {
            prefetchCommunitySearchOverlay();
            flushSync(() => ctx.setShowFollowingPanel(false));
            ctx.openSearchOverlay();
        },
        onNavigateToPost: ctx.handleNavigateToPost,
        currentUserId: ctx.currentUserId,
        selectedFilterIndex: ctx.selectedFilterIndex,
        onFilterSelect: ctx.setSelectedFilterIndex,
        repositorySearchTerm: ctx.repositorySearchTerm,
        onRepositorySearchTermChange: ctx.setRepositorySearchTerm,
        repositorySortBy: ctx.repositorySortBy,
        onRepositorySortChange: ctx.setRepositorySortBy,
        repositorySelectedType: ctx.repositorySelectedType,
        onRepositoryTypeChange: ctx.setRepositorySelectedType,
        repositorySelectedTag: ctx.repositorySelectedTag,
        onRepositoryTagChange: ctx.setRepositorySelectedTag,
        followingRecords: ctx.followingRecords,
        onOpenFollowing: () => flushSync(() => ctx.setShowFollowingPanel(true)),
        forumFeedScope: ctx.forumFeedScope,
        onForumFeedScopeChange: ctx.setForumFeedScope,
        forumStreamConnected: ctx.forumStreamConnected,
        onAppBarDropdownChange: ctx.setForumAppBarDropdownOpen,
        closeAppBarDropdownsRef: ctx.closeAppBarDropdownsRef,
        showFollowingPanel: ctx.showFollowingPanel,
        onCloseFollowingPanel: () => flushSync(() => ctx.setShowFollowingPanel(false)),
        followerRecords: ctx.followerRecords,
        followingAuthorNames: ctx.followingAuthorNames,
        onUnfollow: (id) => void ctx.handleFollow(id),
        onFollowBack: (id) => void ctx.handleFollow(id),
        onUpdateFollowPrefs: (id, prefs) => void ctx.handleUpdateFollowPrefs(id, prefs),
        onOpenFollowingFeed: () => ctx.setForumFeedScope('following'),
        onOpenProfile: ctx.openForumProfile,
        loadingPosts: ctx.loadingPosts,
        hasMore: ctx.hasMore,
        loadingMore: ctx.loadingMore,
        visiblePosts: ctx.visiblePosts,
        isAdmin: ctx.isAdmin,
        onToggleUpvote: ctx.handleToggleUpvote,
        onCommentClick: ctx.openCommentSheet,
        onDelete: ctx.requestDeletePost,
        onEdit: ctx.handleEditPost,
        onReport: ctx.handleReportPost,
        onShare: ctx.handleSharePost,
        onLoadMore: ctx.handleLoadMore,
        onTogglePin: ctx.handleTogglePin,
        onFollow: ctx.handleFollow,
        followingIds: ctx.followingIds,
        bookmarkedIds: ctx.bookmarkedIds,
        onToggleBookmark: ctx.handleToggleBookmark,
        onCopyPostText: ctx.handleCopyPostText,
        onSaveToVault: ctx.handleSavePostToVault,
        onSaveToDevice: ctx.handleSavePostToDevice,
        onToggleLock: ctx.handleToggleLock,
        onMuteUser: ctx.handleMuteUser,
        userStats: ctx.userStats,
        threadFollowingIds: ctx.threadFollowingIds,
        onToggleThreadFollow: (id) => void ctx.handleToggleThreadFollow(id),
        activeGroupId: ctx.activeGroupId,
        activeGroup: ctx.activeGroup,
        onLeaveGroup: () => void ctx.handleLeaveGroup(),
        leavingGroup: ctx.leavingGroup,
        groupPostsLoading: ctx.groupPostsLoading,
        groupPostsHasMore: ctx.groupPostsHasMore,
        groupPostsLoadingMore: ctx.groupPostsLoadingMore,
        groupVisiblePosts: ctx.groupVisiblePosts,
        onLoadMoreGroupPosts: () => void ctx.handleLoadMoreGroupPosts(),
        onBackFromGroup: () => ctx.setActiveGroupId(null),
        groups: ctx.groups,
        groupsLoading: ctx.groupsLoading,
        groupsSearchQuery: ctx.groupsSearchQuery,
        onGroupsSearchQueryChange: ctx.setGroupsSearchQuery,
        onJoinGroup: (groupId) => void ctx.handleJoinGroup(groupId),
        onOpenGroup: ctx.handleOpenGroup,
        onCreateGroupClick: () => {
            if (!ctx.currentUserId) {
                SmartToast.warning('سجّل الدخول لإنشاء مجموعة');
                return;
            }
            ctx.setIsCreateGroupOpen(true);
        },
        joiningGroupId: ctx.joiningGroupId,
        onOpenAddQuestion: () =>
            openForumAddQuestionGuard(ctx.currentUserId, ctx.openAddQuestion, { isBanned: ctx.isBanned }),
        canPublishPost: Boolean(ctx.currentUserId) && !ctx.isBanned,
    };
}
