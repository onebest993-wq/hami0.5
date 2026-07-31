import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { prefetchRoyalLawyerProfile } from '@/app/utils/lazyComponents';
import { useForumLifecycle } from './useForumLifecycle';
import { warmForumSocialForUser } from '@/app/hooks/lawyerDashboard/forumIntentWarm';
import { useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { RepositorySortKey } from '../repositoryListFilters';
import { useForumNotificationStream } from '@/app/hooks/useForumNotificationStream';
import { useMutedUsers } from '../useMutedUsers';
import { useForumUserStats } from '../useForumUserStats';
import { scheduleCommunityProfileOverlayPrefetch } from '../communityOverlayPrefetch';
import { useForumEscapeStack } from './useForumEscapeStack';
import { useCommunityForumAccess } from './useCommunityForumAccess';
import { useCommunityDualPostLists } from './useCommunityDualPostLists';
import { useCommunityPostsFeed } from './useCommunityPostsFeed';
import { useCommunityGroupsFeed } from './useCommunityGroupsFeed';
import { useCommunityPostActions } from './useCommunityPostActions';
import { useCommunityAddQuestion } from './useCommunityAddQuestion';
import { useCommunityScreenSocialGraph } from './useCommunityScreenSocialGraph';
import { useCommunityScreenSearchOverlay } from './useCommunityScreenSearchOverlay';
import { useCommunityScreenPostModeration } from './useCommunityScreenPostModeration';
import {
    buildCommunityScreenBodyProps,
    buildCommunityScreenOverlayProps,
} from './communityScreenPropBuilders';
import {
    COMMUNITY_USER_STATS_COMMENTS_PER_POST,
    COMMUNITY_USER_STATS_VISIBLE_LIMIT,
} from '../communityScreenConstants';
import {
    persistCommunitySection,
    readPersistedCommunitySection,
    type CommunitySection,
} from '../communitySectionState';

export type CommunityScreenControllerProps = {
    /** passed from shell for mount/visibility coordination */
    isOpen?: boolean;
    keepAlive?: boolean;
    onBack?: () => void;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    /** فُتح من لوحة المحامي — لا نحجب المنتدى إذا كان الجلسة نشطة هناك */
    lawyerShellAccess?: boolean;
    fallbackUserId?: string | null;
    /** عند فتح ملفك من المنتدى — نفس مسار زر الهيدر */
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
    const { authUser, authIsLoading, persistedUser, canAccessLawyerForum, currentUserId, showLoadingShell, isAdmin } =
        useCommunityForumAccess({ lawyerShellAccess, fallbackUserId });
    useBodyScrollLock(Boolean(onBack) && forumSurfaceOpen);
    const forumStreamConnected = useForumNotificationStream(
        currentUserId,
        forumSurfaceOpen && Boolean(currentUserId),
    );
    useEffect(() => {
        warmForumSocialForUser(currentUserId);
    }, [currentUserId]);
    const dualLists = useCommunityDualPostLists();
    const { posts, groupPosts, findPostById, updatePostList } = dualLists;

    const [repositorySearchTerm, setRepositorySearchTerm] = useState('');
    const [repositorySortBy, setRepositorySortBy] = useState<RepositorySortKey>('newest');
    const [repositorySelectedType, setRepositorySelectedType] = useState('الكل');
    const [repositorySelectedTag, setRepositorySelectedTag] = useState<string | null>(null);
    const [activeSection, setActiveSectionState] = useState<CommunitySection>(() => readPersistedCommunitySection());
    const [selectedFilterIndex, setSelectedFilterIndex] = useState(0);
    const [profileView, setProfileView] = useState<{ userId: string; displayName?: string } | null>(null);
    const [forumAppBarDropdownOpen, setForumAppBarDropdownOpen] = useState(false);
    const closeAppBarDropdownsRef = useRef<(() => void) | null>(null);
    const { userStats, bumpFollowerCount, loadUserStats, queueLoadUserStats } = useForumUserStats();
    const [showFollowingPanel, setShowFollowingPanel] = useState(false);
    const [forumFeedScope, setForumFeedScope] = useState<'all' | 'following'>('all');
    const { mutedIds, isMuted, toggleMute } = useMutedUsers(currentUserId);
    const [commentingPostId, setCommentingPostId] = useState<string | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const socialGraph = useCommunityScreenSocialGraph({
        currentUserId,
        authUser,
        posts,
        showFollowingPanel,
        bumpFollowerCount,
        toggleMute,
        isMuted,
    });

    const {
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
    } = socialGraph;

    const groupsFeed = useCommunityGroupsFeed({
        lists: dualLists,
        mutedIds,
        currentUserId,
        authIsLoading,
        activeSection,
    });

    const {
        groups,
        groupsLoading,
        groupsSearchQuery,
        setGroupsSearchQuery,
        activeGroupId,
        setActiveGroupId,
        clearActiveGroup,
        activeGroup,
        groupPostsLoading,
        groupPostsHasMore,
        groupPostsLoadingMore,
        groupVisiblePosts,
        isCreateGroupOpen,
        setIsCreateGroupOpen,
        newGroupName,
        setNewGroupName,
        newGroupDesc,
        setNewGroupDesc,
        submittingGroup,
        joiningGroupId,
        leavingGroup,
        handleJoinGroup,
        handleOpenGroup,
        handleLeaveGroup,
        handleCreateGroup,
        handleLoadMoreGroupPosts,
        appendPublishedGroupPost,
    } = groupsFeed;

    const setActiveSection = useCallback(
        (section: CommunitySection) => {
            setActiveSectionState(section);
            persistCommunitySection(section);
            if (section !== 'groups') {
                clearActiveGroup();
            }
        },
        [clearActiveGroup],
    );

    const postsFeed = useCommunityPostsFeed({
        lists: dualLists,
        mutedIds,
        currentUserId,
        followingIds,
        forumFeedScope,
        selectedFilterIndex,
        authIsLoading,
        activeSection,
        surfaceOpen: forumSurfaceOpen,
        initialPostId,
        initialOpenComments,
        onOpenComments: setCommentingPostId,
        onActivateForumSection: () => setActiveSection('forum'),
    });

    const addQuestion = useCommunityAddQuestion({
        lists: dualLists,
        currentUserId,
        persistedUserId: persistedUser?.id ?? null,
        authUser,
        isBanned,
        activeGroupId,
        appendPublishedGroupPost,
        onForumPostPublished: () => {
            setForumFeedScope('all');
            setSelectedFilterIndex(0);
        },
    });

    const postActions = useCommunityPostActions({
        lists: dualLists,
        currentUserId,
        isAdmin,
        isBanned,
        authUser,
        commentingPostId,
        onThreadSubscribed: markThreadSubscribed,
        onPostDeleted: (postId) => {
            setCommentingPostId((current) => (current === postId ? null : current));
        },
    });

    const {
        loadingPosts,
        loadingMore,
        hasMore,
        visiblePosts,
        allTags,
        handleLoadMore,
    } = postsFeed;

    const searchOverlay = useCommunityScreenSearchOverlay(posts, allTags);
    const {
        isSearchOpen,
        setIsSearchOpen,
        openSearchOverlay,
        closeSearchOverlay,
        searchQuery,
        setSearchQuery,
        filterHasPdf,
        setFilterHasPdf,
        filterHasImage,
        setFilterHasImage,
        selectedTag,
        setSelectedTag,
        allSearchTags,
        filteredPosts,
        filteredRepositoryDocs,
    } = searchOverlay;

    const postModeration = useCommunityScreenPostModeration({
        currentUserId,
        isAdmin,
        authUser,
        persistedUser,
        findPostById,
        updatePostList,
        bookmarkedIds,
        setBookmarkedIds,
    });

    const {
        editingPostId,
        setEditingPostId,
        editingText,
        setEditingText,
        savingEdit,
        handleTogglePin,
        handleToggleBookmark,
        handleCopyPostText,
        handleSavePostToVault,
        handleSavePostToDevice,
        handleToggleLock,
        handleEditPost,
        handleSaveEdit,
        handleReportPost,
    } = postModeration;

    const {
        isAddQuestionOpen,
        openAddQuestion,
        closeAddQuestion,
        newPostText,
        setNewPostText,
        newTagText,
        setNewTagText,
        newIsAnonymous,
        setNewIsAnonymous,
        newIsUrgent,
        setNewIsUrgent,
        newAttachment,
        removeAttachment,
        submittingPost,
        isRecordingVoice,
        voiceRecordingSec,
        imageInputRef,
        docInputRef,
        toggleVoiceRecording,
        handleUploadAttachment,
        handleAddPost,
    } = addQuestion;

    const {
        handleToggleUpvote,
        handleAddComment,
        handleDeleteComment,
        handleEditComment,
        requestDeletePost,
        confirmDeletePost,
        pendingDeletePostId,
        pendingDeletePost,
        deletingPost,
        cancelDeletePostRequest,
        handleSharePost,
        handleToggleBestAnswer,
        handleToggleCommentUpvote,
        handleReportComment,
    } = postActions;

    const openForumProfile = useCallback(
        (userId: string, displayName?: string) => {
            if (!userId) return;
            if (userId === currentUserId && onOpenOwnProfile) {
                onOpenOwnProfile();
                return;
            }
            void prefetchRoyalLawyerProfile(userId);
            void loadUserStats([userId]);
            setProfileView({ userId, displayName });
        },
        [currentUserId, onOpenOwnProfile, loadUserStats],
    );

    const closeForumProfile = useCallback(() => setProfileView(null), []);

    useEffect(() => {
        scheduleCommunityProfileOverlayPrefetch();
    }, []);

    useEffect(() => {
        const feedPosts =
            activeSection === 'groups' && activeGroupId ? groupVisiblePosts : visiblePosts;
        const slice = feedPosts.slice(0, COMMUNITY_USER_STATS_VISIBLE_LIMIT);
        const authorIds = slice.map((p) => p.authorId).filter(Boolean);
        const commentIds = slice
            .flatMap((p) =>
                p.comments
                    .slice(0, COMMUNITY_USER_STATS_COMMENTS_PER_POST)
                    .map((c) => c.authorId)
                    .filter(Boolean),
            );
        queueLoadUserStats([...authorIds, ...commentIds]);
    }, [
        activeGroupId,
        activeSection,
        groupVisiblePosts,
        queueLoadUserStats,
        visiblePosts,
    ]);

    const activePostForComments = useMemo(() => {
        if (!commentingPostId) return null;
        return findPostById(commentingPostId);
    }, [commentingPostId, posts, groupPosts, findPostById]);

    const handleNavigateToPost = useCallback((postId: string) => {
        setActiveSection('forum');
        window.setTimeout(() => {
            document.getElementById(`forum-post-${postId}`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }, 120);
    }, [setActiveSection]);

    const handleSearchOpenPost = useCallback((postId: string) => {
        closeSearchOverlay();
        handleNavigateToPost(postId);
    }, [closeSearchOverlay, handleNavigateToPost]);

    const handleSearchOpenDocument = useCallback((doc: RepositoryDocument) => {
        setActiveSection('repository');
        setRepositorySearchTerm(doc.title);
        closeSearchOverlay();
    }, [closeSearchOverlay, setActiveSection]);

    const openFullscreenImage = useCallback((url: string) => setFullscreenImage(url), []);
    const openCommentSheet = useCallback((id: string) => {
        void import('@/app/components/lawyer/CommunityScreen/communityScreenLazyOverlays').then((m) =>
            m.prefetchCommunityCommentOverlay(),
        );
        setCommentingPostId(id);
    }, []);

    const { popForumLayer } = useForumEscapeStack({
        enabled: forumSurfaceOpen,
        fullscreenImage,
        profileView: profileView !== null,
        pendingDeletePostId,
        editingPostId,
        isCreateGroupOpen,
        commentingPostId,
        isAddQuestionOpen,
        isSearchOpen,
        showFollowingPanel,
        activeGroupId,
        forumAppBarDropdownOpen,
        onBack,
        onCloseFullscreenImage: () => setFullscreenImage(null),
        onCloseProfile: closeForumProfile,
        onCancelDelete: () => {
            if (!deletingPost) cancelDeletePostRequest();
        },
        onCancelEdit: () => {
            if (savingEdit) return;
            setEditingPostId(null);
            setEditingText('');
        },
        onCloseCreateGroup: () => {
            if (submittingGroup) return;
            setIsCreateGroupOpen(false);
        },
        onCloseComments: () => setCommentingPostId(null),
        onCloseAddQuestion: closeAddQuestion,
        onCloseSearch: closeSearchOverlay,
        onCloseFollowingPanel: () => flushSync(() => setShowFollowingPanel(false)),
        onCloseAppBarDropdowns: () => closeAppBarDropdownsRef.current?.(),
        onLeaveGroupFeed: () => setActiveGroupId(null),
    });

    useForumLifecycle(currentUserId, loadingPosts, visiblePosts.length, forumSurfaceOpen);

    /** keepAlive مغلق: أسقط طبقات portal على document.body حتى لا تبقى فوق الـ dock */
    useEffect(() => {
        if (forumSurfaceOpen) return;
        setFullscreenImage(null);
        setProfileView(null);
        if (!deletingPost) cancelDeletePostRequest();
        if (!savingEdit) {
            setEditingPostId(null);
            setEditingText('');
        }
        if (!submittingGroup) setIsCreateGroupOpen(false);
        setCommentingPostId(null);
        closeAddQuestion({ soft: true });
        closeSearchOverlay();
        /* بلا flushSync — الاستدعاء من useEffect يُطلق تحذير React */
        setShowFollowingPanel(false);
        closeAppBarDropdownsRef.current?.();
        setForumAppBarDropdownOpen(false);
    }, [
        forumSurfaceOpen,
        deletingPost,
        cancelDeletePostRequest,
        savingEdit,
        submittingGroup,
        setIsCreateGroupOpen,
        closeAddQuestion,
        closeSearchOverlay,
    ]);

    const gateBlocked = showLoadingShell || !canAccessLawyerForum;

    const propBuilderCtx = useMemo(
        () => ({
            onBack: popForumLayer,
            forumSurfaceOpen,
            activeSection,
            setActiveSection,
            setIsSearchOpen,
            openSearchOverlay,
            closeSearchOverlay,
            handleNavigateToPost,
            currentUserId,
            isBanned,
            selectedFilterIndex,
            setSelectedFilterIndex,
            repositorySearchTerm,
            setRepositorySearchTerm,
            repositorySortBy,
            setRepositorySortBy,
            repositorySelectedType,
            setRepositorySelectedType,
            repositorySelectedTag,
            setRepositorySelectedTag,
            followingRecords,
            setShowFollowingPanel,
            forumFeedScope,
            setForumFeedScope,
            forumStreamConnected,
            setForumAppBarDropdownOpen,
            closeAppBarDropdownsRef,
            showFollowingPanel,
            followerRecords,
            followingAuthorNames,
            handleFollow,
            handleUpdateFollowPrefs,
            openForumProfile,
            loadingPosts,
            hasMore,
            loadingMore,
            visiblePosts,
            isAdmin,
            handleToggleUpvote,
            openFullscreenImage,
            openCommentSheet,
            requestDeletePost,
            handleEditPost,
            handleReportPost,
            handleSharePost,
            handleLoadMore,
            handleTogglePin,
            followingIds,
            bookmarkedIds,
            handleToggleBookmark,
            handleCopyPostText,
            handleSavePostToVault,
            handleSavePostToDevice,
            handleToggleLock,
            handleMuteUser,
            userStats,
            threadFollowingIds,
            handleToggleThreadFollow,
            activeGroupId,
            activeGroup,
            handleLeaveGroup,
            leavingGroup,
            groupPostsLoading,
            groupPostsHasMore,
            groupPostsLoadingMore,
            groupVisiblePosts,
            handleLoadMoreGroupPosts,
            setActiveGroupId,
            groups,
            groupsLoading,
            groupsSearchQuery,
            setGroupsSearchQuery,
            handleJoinGroup,
            handleOpenGroup,
            setIsCreateGroupOpen,
            joiningGroupId,
            openAddQuestion,
            activePostForComments,
            mutedIds,
            forumMentionCandidates,
            setCommentingPostId,
            handleAddComment,
            handleToggleBestAnswer,
            handleDeleteComment,
            handleEditComment,
            handleToggleCommentUpvote,
            handleReportComment,
            isSearchOpen,
            searchQuery,
            setSearchQuery,
            filterHasPdf,
            setFilterHasPdf,
            filterHasImage,
            setFilterHasImage,
            selectedTag,
            setSelectedTag,
            allSearchTags,
            filteredPosts,
            filteredRepositoryDocs,
            handleSearchOpenPost,
            handleSearchOpenDocument,
            isAddQuestionOpen,
            newPostText,
            setNewPostText,
            newTagText,
            setNewTagText,
            newIsAnonymous,
            setNewIsAnonymous,
            newIsUrgent,
            setNewIsUrgent,
            newAttachment,
            removeAttachment,
            submittingPost,
            isRecordingVoice,
            voiceRecordingSec,
            imageInputRef,
            docInputRef,
            toggleVoiceRecording,
            handleUploadAttachment,
            handleAddPost,
            closeAddQuestion,
            fullscreenImage,
            setFullscreenImage,
            isCreateGroupOpen,
            newGroupName,
            newGroupDesc,
            submittingGroup,
            setNewGroupName,
            setNewGroupDesc,
            handleCreateGroup,
            editingPostId,
            editingText,
            setEditingText,
            handleSaveEdit,
            setEditingPostId,
            savingEdit,
            pendingDeletePostId,
            pendingDeletePost,
            deletingPost,
            confirmDeletePost,
            cancelDeletePostRequest,
            profileView,
            closeForumProfile,
            followBusyUserId,
        }),
        [
            popForumLayer,
            forumSurfaceOpen,
            activeSection,
            setActiveSection,
            handleNavigateToPost,
            openSearchOverlay,
            closeSearchOverlay,
            currentUserId,
            isBanned,
            selectedFilterIndex,
            repositorySearchTerm,
            repositorySortBy,
            repositorySelectedType,
            repositorySelectedTag,
            followingRecords,
            forumFeedScope,
            forumStreamConnected,
            showFollowingPanel,
            followerRecords,
            followingAuthorNames,
            handleFollow,
            handleUpdateFollowPrefs,
            openForumProfile,
            loadingPosts,
            hasMore,
            loadingMore,
            visiblePosts,
            isAdmin,
            handleToggleUpvote,
            requestDeletePost,
            handleEditPost,
            handleReportPost,
            handleSharePost,
            handleLoadMore,
            handleTogglePin,
            followingIds,
            bookmarkedIds,
            handleToggleBookmark,
            handleCopyPostText,
            handleSavePostToVault,
            handleSavePostToDevice,
            handleToggleLock,
            handleMuteUser,
            userStats,
            threadFollowingIds,
            handleToggleThreadFollow,
            activeGroupId,
            activeGroup,
            handleLeaveGroup,
            leavingGroup,
            groupPostsLoading,
            groupPostsHasMore,
            groupPostsLoadingMore,
            groupVisiblePosts,
            handleLoadMoreGroupPosts,
            groups,
            groupsLoading,
            groupsSearchQuery,
            handleJoinGroup,
            handleOpenGroup,
            joiningGroupId,
            openAddQuestion,
            activePostForComments,
            mutedIds,
            forumMentionCandidates,
            handleAddComment,
            handleToggleBestAnswer,
            handleDeleteComment,
            handleEditComment,
            handleToggleCommentUpvote,
            handleReportComment,
            isSearchOpen,
            searchQuery,
            filterHasPdf,
            filterHasImage,
            selectedTag,
            allSearchTags,
            filteredPosts,
            filteredRepositoryDocs,
            handleSearchOpenPost,
            handleSearchOpenDocument,
            isAddQuestionOpen,
            newPostText,
            newTagText,
            newIsAnonymous,
            newIsUrgent,
            newAttachment,
            submittingPost,
            isRecordingVoice,
            voiceRecordingSec,
            handleUploadAttachment,
            handleAddPost,
            closeAddQuestion,
            fullscreenImage,
            isCreateGroupOpen,
            newGroupName,
            newGroupDesc,
            submittingGroup,
            handleCreateGroup,
            editingPostId,
            editingText,
            handleSaveEdit,
            savingEdit,
            pendingDeletePostId,
            pendingDeletePost,
            deletingPost,
            confirmDeletePost,
            profileView,
            closeForumProfile,
            followBusyUserId,
        ],
    );

    const bodyProps = useMemo(
        () => buildCommunityScreenBodyProps(propBuilderCtx),
        [propBuilderCtx],
    );
    const overlayProps = useMemo(
        () => buildCommunityScreenOverlayProps(propBuilderCtx),
        [propBuilderCtx],
    );

    return {
        gateBlocked,
        accessGateProps: {
            showLoadingShell,
            canAccessLawyerForum,
        },
        bodyProps,
        overlayProps,
    };
}
