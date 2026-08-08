import type { MutableRefObject, RefObject } from 'react';
import { flushSync } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import type { ForumParticipant } from '@/app/services/forum/forumMentionUtils';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityScreenBodyProps } from '../components/CommunityScreenBody';
import type { CommunityScreenOverlaysProps } from '../components/CommunityScreenOverlays';
import { openForumAddQuestionGuard } from '../forumAddQuestionGuard';
import { prefetchCommunitySearchOverlay } from '../communityOverlayPrefetch';

export type CommunityScreenPropBuilderContext = {
    onBack?: () => void;
    /** سطح المنتدى ظاهر — يُمرَّر لإيقاف لوحات AppBar/المستودع عند keepAlive */
    forumSurfaceOpen: boolean;
    activeSection: CommunitySection;
    setActiveSection: (section: CommunitySection) => void;
    setIsSearchOpen: (open: boolean) => void;
    openSearchOverlay: () => void;
    closeSearchOverlay: () => void;
    handleNavigateToPost: (postId: string) => void;
    currentUserId: string | null;
    isBanned: boolean;
    selectedFilterIndex: number;
    setSelectedFilterIndex: (index: number) => void;
    repositorySearchTerm: string;
    setRepositorySearchTerm: (value: string) => void;
    repositorySortBy: CommunityScreenBodyProps['repositorySortBy'];
    setRepositorySortBy: CommunityScreenBodyProps['onRepositorySortChange'];
    repositorySelectedType: string;
    setRepositorySelectedType: (value: string) => void;
    repositorySelectedTag: string | null;
    setRepositorySelectedTag: (value: string | null) => void;
    followingRecords: ForumFollowRecord[];
    setShowFollowingPanel: (open: boolean) => void;
    forumFeedScope: 'all' | 'following';
    setForumFeedScope: (scope: 'all' | 'following') => void;
    forumStreamConnected: boolean;
    setForumAppBarDropdownOpen: (open: boolean) => void;
    closeAppBarDropdownsRef: MutableRefObject<(() => void) | null>;
    showFollowingPanel: boolean;
    followerRecords: Array<{ followerId: string; createdAt: string }>;
    followingAuthorNames: Record<string, string>;
    handleFollow: (id: string) => void;
    handleUpdateFollowPrefs: (
        id: string,
        prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
    ) => void;
    openForumProfile: (userId: string, displayName?: string) => void;
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    isAdmin: boolean;
    handleToggleUpvote: (postId: string) => void;
    openFullscreenImage: (url: string) => void;
    openCommentSheet: (postId: string) => void;
    requestDeletePost: (postId: string) => void;
    handleEditPost: (postId: string) => void;
    handleReportPost: (postId: string) => void;
    handleSharePost: (postId: string) => void;
    handleLoadMore: () => void;
    handleTogglePin: (postId: string) => void;
    followingIds: Set<string>;
    bookmarkedIds: Set<string>;
    handleToggleBookmark: (postId: string) => void;
    handleCopyPostText: (postId: string) => void;
    handleSavePostToVault: (postId: string) => void;
    handleSavePostToDevice: (postId: string) => void;
    handleToggleLock: (postId: string) => void;
    handleMuteUser: (userId: string) => void;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    threadFollowingIds: Set<string>;
    handleToggleThreadFollow: (id: string) => void;
    activeGroupId: string | null;
    activeGroup: ForumGroup | null;
    handleLeaveGroup: () => void;
    leavingGroup: boolean;
    groupPostsLoading: boolean;
    groupPostsHasMore: boolean;
    groupPostsLoadingMore: boolean;
    groupVisiblePosts: CommunityPost[];
    handleLoadMoreGroupPosts: () => void;
    setActiveGroupId: (id: string | null) => void;
    groups: ForumGroup[];
    groupsLoading: boolean;
    groupsSearchQuery: string;
    setGroupsSearchQuery: (value: string) => void;
    handleJoinGroup: (groupId: string) => void;
    handleOpenGroup: (groupId: string) => void;
    setIsCreateGroupOpen: (open: boolean) => void;
    joiningGroupId: string | null;
    openAddQuestion: () => void;
    activePostForComments: CommunityPost | null;
    mutedIds: Set<string>;
    forumMentionCandidates: ForumParticipant[];
    setCommentingPostId: (id: string | null) => void;
    handleAddComment: CommunityScreenOverlaysProps['onAddComment'];
    handleToggleBestAnswer: (postId: string, commentId: string) => void;
    handleDeleteComment: (postId: string, commentId: string) => void;
    handleEditComment: (postId: string, commentId: string, content: string) => void;
    handleToggleCommentUpvote: (commentId: string) => void;
    handleReportComment: (commentId: string) => void;
    isSearchOpen: boolean;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    filterHasPdf: boolean;
    setFilterHasPdf: (value: boolean) => void;
    filterHasImage: boolean;
    setFilterHasImage: (value: boolean) => void;
    selectedTag: string | null;
    setSelectedTag: (value: string | null) => void;
    allSearchTags: string[];
    filteredPosts: CommunityPost[];
    filteredRepositoryDocs: RepositoryDocument[];
    handleSearchOpenPost: (postId: string) => void;
    handleSearchOpenDocument: (doc: RepositoryDocument) => void;
    isAddQuestionOpen: boolean;
    newPostText: string;
    setNewPostText: (value: string) => void;
    newTagText: string;
    setNewTagText: (value: string) => void;
    newIsAnonymous: boolean;
    setNewIsAnonymous: (value: boolean) => void;
    newIsUrgent: boolean;
    setNewIsUrgent: (value: boolean) => void;
    newAttachment: CommunityPost['attachment'];
    removeAttachment: () => void;
    submittingPost: boolean;
    isRecordingVoice: boolean;
    voiceRecordingSec: number;
    imageInputRef: RefObject<HTMLInputElement | null>;
    docInputRef: RefObject<HTMLInputElement | null>;
    toggleVoiceRecording: () => void;
    handleUploadAttachment: (file: File, kind: 'image' | 'document') => void;
    handleAddPost: () => void;
    closeAddQuestion: () => void;
    fullscreenImage: string | null;
    setFullscreenImage: (url: string | null) => void;
    isCreateGroupOpen: boolean;
    newGroupName: string;
    newGroupDesc: string;
    submittingGroup: boolean;
    setNewGroupName: (value: string) => void;
    setNewGroupDesc: (value: string) => void;
    handleCreateGroup: () => void;
    editingPostId: string | null;
    editingText: string;
    setEditingText: (value: string) => void;
    handleSaveEdit: () => void;
    setEditingPostId: (id: string | null) => void;
    savingEdit: boolean;
    pendingDeletePostId: string | null;
    pendingDeletePost: CommunityPost | null;
    deletingPost: boolean;
    confirmDeletePost: () => void;
    cancelDeletePostRequest: () => void;
    profileView: { userId: string; displayName?: string } | null;
    closeForumProfile: () => void;
    followBusyUserId: string | null;
};

export function buildCommunityScreenBodyProps(ctx: CommunityScreenPropBuilderContext): CommunityScreenBodyProps {
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
        onImageClick: ctx.openFullscreenImage,
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

export function buildCommunityScreenOverlayProps(
    ctx: CommunityScreenPropBuilderContext,
): CommunityScreenOverlaysProps {
    return {
        activePostForComments: ctx.activePostForComments,
        currentUserId: ctx.currentUserId,
        isAdmin: ctx.isAdmin,
        followingIds: ctx.followingIds,
        userStats: ctx.userStats,
        mutedIds: ctx.mutedIds,
        forumMentionCandidates: ctx.forumMentionCandidates,
        onCloseComments: () => ctx.setCommentingPostId(null),
        onAddComment: ctx.handleAddComment,
        onToggleBestAnswer: ctx.handleToggleBestAnswer,
        onDeleteComment: ctx.handleDeleteComment,
        onEditComment: ctx.handleEditComment,
        onFollow: ctx.handleFollow,
        onToggleCommentUpvote: ctx.handleToggleCommentUpvote,
        onReportComment: ctx.handleReportComment,
        onMuteUser: ctx.handleMuteUser,
        onOpenProfile: ctx.openForumProfile,
        isSearchOpen: ctx.isSearchOpen,
        searchQuery: ctx.searchQuery,
        onSearchQueryChange: ctx.setSearchQuery,
        filterHasPdf: ctx.filterHasPdf,
        onFilterHasPdfChange: ctx.setFilterHasPdf,
        filterHasImage: ctx.filterHasImage,
        onFilterHasImageChange: ctx.setFilterHasImage,
        selectedTag: ctx.selectedTag,
        onSelectedTagChange: ctx.setSelectedTag,
        allSearchTags: ctx.allSearchTags,
        filteredPosts: ctx.filteredPosts,
        filteredRepositoryDocs: ctx.filteredRepositoryDocs,
        onCloseSearch: () => ctx.closeSearchOverlay(),
        onOpenPost: ctx.handleSearchOpenPost,
        onOpenDocument: ctx.handleSearchOpenDocument,
        isAddQuestionOpen: ctx.isAddQuestionOpen,
        newPostText: ctx.newPostText,
        onNewPostTextChange: ctx.setNewPostText,
        newTagText: ctx.newTagText,
        onNewTagTextChange: ctx.setNewTagText,
        newIsAnonymous: ctx.newIsAnonymous,
        onNewIsAnonymousChange: ctx.setNewIsAnonymous,
        newIsUrgent: ctx.newIsUrgent,
        onNewIsUrgentChange: ctx.setNewIsUrgent,
        newAttachment: ctx.newAttachment,
        onRemoveAttachment: ctx.removeAttachment,
        submittingPost: ctx.submittingPost,
        isRecordingVoice: ctx.isRecordingVoice,
        voiceRecordingSec: ctx.voiceRecordingSec,
        imageInputRef: ctx.imageInputRef,
        docInputRef: ctx.docInputRef,
        onToggleVoiceRecording: () => void ctx.toggleVoiceRecording(),
        onImageUpload: (file) => ctx.handleUploadAttachment(file, 'image'),
        onDocUpload: (file) => ctx.handleUploadAttachment(file, 'document'),
        onSubmitPost: () => void ctx.handleAddPost(),
        onCloseAddQuestion: ctx.closeAddQuestion,
        fullscreenImage: ctx.fullscreenImage,
        onCloseFullscreenImage: () => ctx.setFullscreenImage(null),
        isCreateGroupOpen: ctx.isCreateGroupOpen,
        newGroupName: ctx.newGroupName,
        newGroupDesc: ctx.newGroupDesc,
        submittingGroup: ctx.submittingGroup,
        onNewGroupNameChange: ctx.setNewGroupName,
        onNewGroupDescChange: ctx.setNewGroupDesc,
        onSubmitCreateGroup: () => void ctx.handleCreateGroup(),
        onCloseCreateGroup: () => {
            if (ctx.submittingGroup) return;
            ctx.setIsCreateGroupOpen(false);
        },
        editingPostId: ctx.editingPostId,
        editingText: ctx.editingText,
        onEditingTextChange: ctx.setEditingText,
        onSaveEdit: () => void ctx.handleSaveEdit(),
        onCancelEdit: () => {
            ctx.setEditingPostId(null);
            ctx.setEditingText('');
        },
        savingEdit: ctx.savingEdit,
        pendingDeletePostId: ctx.pendingDeletePostId,
        pendingDeletePost: ctx.pendingDeletePost,
        deletingPost: ctx.deletingPost,
        onConfirmDeletePost: () => void ctx.confirmDeletePost(),
        onCancelDeletePost: () => {
            if (!ctx.deletingPost) ctx.cancelDeletePostRequest();
        },
        profileView: ctx.profileView,
        onCloseProfile: ctx.closeForumProfile,
        followBusyUserId: ctx.followBusyUserId,
    };
}
