import type { MutableRefObject } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import type { RepositorySortKey } from '@/app/components/lawyer/CommunityScreen/repositoryListFilters';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { ForumFollowRecord } from '@/app/services/forum/forumFollowTypes';
import { ForumAppBar } from '@/app/components/lawyer/CommunityScreen/components/ForumAppBar';
import { ForumFollowingPanel } from '@/app/components/lawyer/CommunityScreen/components/ForumFollowingPanel';
import { ForumPostList } from '@/app/components/lawyer/CommunityScreen/components/ForumPostList';
import { LazyLegalRepository } from '@/app/components/lawyer/CommunityScreen/communityScreenLazySections';
import { ForumGroupFeedPanel } from '@/app/components/lawyer/CommunityScreen/components/ForumGroupFeedPanel';
import { ForumGroupsDirectory } from '@/app/components/lawyer/CommunityScreen/components/ForumGroupsDirectory';
import {
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { prefetchCommunityAddQuestionOverlay } from '@/app/components/lawyer/CommunityScreen/communityOverlayPrefetch';
import { SmartToast } from '@/app/components/ui/SmartToast';

export type CommunityScreenBodyProps = {
    onBack?: () => void;
    activeSection: CommunitySection;
    onSectionChange: (section: CommunitySection) => void;
    onSearchOpen: () => void;
    onNavigateToPost: (postId: string) => void;
    currentUserId: string | null;
    selectedFilterIndex: number;
    onFilterSelect: (index: number) => void;
    repositorySearchTerm: string;
    onRepositorySearchTermChange: (value: string) => void;
    repositorySortBy: RepositorySortKey;
    onRepositorySortChange: (value: RepositorySortKey) => void;
    repositorySelectedType: string;
    onRepositoryTypeChange: (value: string) => void;
    repositorySelectedTag: string | null;
    onRepositoryTagChange: (value: string | null) => void;
    followingRecords: ForumFollowRecord[];
    onOpenFollowing: () => void;
    forumFeedScope: 'all' | 'following';
    onForumFeedScopeChange: (scope: 'all' | 'following') => void;
    forumStreamConnected: boolean;
    onAppBarDropdownChange: (open: boolean) => void;
    closeAppBarDropdownsRef: MutableRefObject<(() => void) | null>;
    showFollowingPanel: boolean;
    onCloseFollowingPanel: () => void;
    followerRecords: Array<{ followerId: string; createdAt: string }>;
    followingAuthorNames: Record<string, string>;
    onUnfollow: (id: string) => void;
    onFollowBack: (id: string) => void;
    onUpdateFollowPrefs: (
        id: string,
        prefs: Partial<Pick<ForumFollowRecord, 'notifyPosts' | 'notifyComments' | 'notifyReplies'>>,
    ) => void;
    onOpenFollowingFeed: () => void;
    onOpenProfile: (userId: string, displayName?: string) => void;
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    isAdmin: boolean;
    onToggleUpvote: (postId: string) => void;
    onImageClick: (url: string) => void;
    onCommentClick: (postId: string) => void;
    onDelete: (postId: string) => void;
    onEdit: (postId: string) => void;
    onReport: (postId: string) => void;
    onShare: (postId: string) => void;
    onLoadMore: () => void;
    onTogglePin: (postId: string) => void;
    onFollow: (userId: string) => void;
    followingIds: Set<string>;
    bookmarkedIds: Set<string>;
    onToggleBookmark: (postId: string) => void;
    onSaveToNotes: (postId: string) => void;
    onSaveToVault: (postId: string) => void;
    onToggleLock: (postId: string) => void;
    onMuteUser: (userId: string) => void;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    threadFollowingIds: Set<string>;
    onToggleThreadFollow: (postId: string) => void;
    activeGroupId: string | null;
    activeGroup: ForumGroup | null;
    onLeaveGroup: () => void;
    leavingGroup: boolean;
    groupPostsLoading: boolean;
    groupPostsHasMore: boolean;
    groupPostsLoadingMore: boolean;
    groupVisiblePosts: CommunityPost[];
    onLoadMoreGroupPosts: () => void;
    onBackFromGroup: () => void;
    groups: ForumGroup[];
    groupsLoading: boolean;
    groupsSearchQuery: string;
    onGroupsSearchQueryChange: (value: string) => void;
    onJoinGroup: (groupId: string) => void;
    onOpenGroup: (groupId: string) => void;
    onCreateGroupClick: () => void;
    joiningGroupId: string | null;
    onOpenAddQuestion: () => void;
};

/** جسم المنتدى: الشريط + الأقسام الثلاثة + FAB */
export function CommunityScreenBody(props: CommunityScreenBodyProps) {
    const {
        onBack,
        activeSection,
        onSectionChange,
        onSearchOpen,
        onNavigateToPost,
        currentUserId,
        selectedFilterIndex,
        onFilterSelect,
        repositorySearchTerm,
        onRepositorySearchTermChange,
        repositorySortBy,
        onRepositorySortChange,
        repositorySelectedType,
        onRepositoryTypeChange,
        repositorySelectedTag,
        onRepositoryTagChange,
        followingRecords,
        onOpenFollowing,
        forumFeedScope,
        onForumFeedScopeChange,
        forumStreamConnected,
        onAppBarDropdownChange,
        closeAppBarDropdownsRef,
        showFollowingPanel,
        onCloseFollowingPanel,
        followerRecords,
        followingAuthorNames,
        onUnfollow,
        onFollowBack,
        onUpdateFollowPrefs,
        onOpenFollowingFeed,
        onOpenProfile,
        loadingPosts,
        hasMore,
        loadingMore,
        visiblePosts,
        isAdmin,
        onToggleUpvote,
        onImageClick,
        onCommentClick,
        onDelete,
        onEdit,
        onReport,
        onShare,
        onLoadMore,
        onTogglePin,
        onFollow,
        followingIds,
        bookmarkedIds,
        onToggleBookmark,
        onSaveToNotes,
        onSaveToVault,
        onToggleLock,
        onMuteUser,
        userStats,
        threadFollowingIds,
        onToggleThreadFollow,
        activeGroupId,
        activeGroup,
        onLeaveGroup,
        leavingGroup,
        groupPostsLoading,
        groupPostsHasMore,
        groupPostsLoadingMore,
        groupVisiblePosts,
        onLoadMoreGroupPosts,
        onBackFromGroup,
        groups,
        groupsLoading,
        groupsSearchQuery,
        onGroupsSearchQueryChange,
        onJoinGroup,
        onOpenGroup,
        onCreateGroupClick,
        joiningGroupId,
        onOpenAddQuestion,
    } = props;

    const [repositoryMounted, setRepositoryMounted] = useState(activeSection === 'repository');
    useEffect(() => {
        if (activeSection === 'repository') setRepositoryMounted(true);
    }, [activeSection]);

    const postListShared = {
        currentUserId,
        onToggleUpvote,
        onImageClick,
        onCommentClick,
        onDelete,
        onEdit,
        onReport,
        onShare,
        isAdmin,
        onTogglePin,
        onFollow,
        followingIds,
        bookmarkedIds,
        onToggleBookmark,
        onSaveToNotes,
        onSaveToVault,
        onToggleLock,
        onMuteUser,
        userStats,
        threadFollowingIds,
        onToggleThreadFollow,
        onOpenProfile,
    };

    return (
        <>
            <ForumAppBar
                onBack={onBack}
                activeSection={activeSection}
                onSectionChange={onSectionChange}
                onSearchOpen={onSearchOpen}
                onNavigateToPost={onNavigateToPost}
                userId={currentUserId}
                selectedFilterIndex={selectedFilterIndex}
                onFilterSelect={onFilterSelect}
                repositorySearchTerm={repositorySearchTerm}
                onRepositorySearchTermChange={onRepositorySearchTermChange}
                repositorySortBy={repositorySortBy}
                onRepositorySortChange={onRepositorySortChange}
                repositorySelectedType={repositorySelectedType}
                onRepositoryTypeChange={onRepositoryTypeChange}
                repositorySelectedTag={repositorySelectedTag}
                onRepositoryTagChange={onRepositoryTagChange}
                followingCount={followingRecords.length}
                onOpenFollowing={onOpenFollowing}
                forumFeedScope={forumFeedScope}
                onForumFeedScopeChange={onForumFeedScopeChange}
                notificationStreamActive={forumStreamConnected}
                onAppBarDropdownChange={onAppBarDropdownChange}
                closeAppBarDropdownsRef={closeAppBarDropdownsRef}
            />

            <ForumFollowingPanel
                open={showFollowingPanel}
                onClose={onCloseFollowingPanel}
                following={followingRecords}
                followers={followerRecords}
                authorNames={followingAuthorNames}
                onUnfollow={onUnfollow}
                onFollowBack={onFollowBack}
                onUpdatePrefs={onUpdateFollowPrefs}
                onOpenFollowingFeed={onOpenFollowingFeed}
                onOpenProfile={onOpenProfile}
            />

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-36">
                <div
                    data-testid="forum-section-forum"
                    className={activeSection === 'forum' ? 'block' : 'hidden'}
                    aria-hidden={activeSection !== 'forum'}
                >
                    {forumFeedScope === 'following' ? (
                        <div className="px-4 pt-2 pb-1 flex items-center justify-between gap-2">
                            <p className="text-[#F0B896]/80 text-[11px] font-bold">عرض منشورات المحامين الذين تتابعهم</p>
                            <button
                                type="button"
                                onClick={() => onForumFeedScopeChange('all')}
                                className="text-[10px] text-white/45 hover:text-[#F0B896] font-bold"
                            >
                                الكل
                            </button>
                        </div>
                    ) : null}
                    <ForumPostList
                        loadingPosts={loadingPosts}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        visiblePosts={visiblePosts}
                        emptyHint={
                            forumFeedScope === 'following'
                                ? followingRecords.length === 0
                                    ? 'تابع محامياً لعرض منشوراته هنا'
                                    : 'لا منشورات جديدة من المحامين الذين تتابعهم'
                                : undefined
                        }
                        onLoadMore={onLoadMore}
                        {...postListShared}
                    />
                </div>
                <div
                    data-testid="forum-section-repository"
                    className={activeSection === 'repository' ? 'block' : 'hidden'}
                    aria-hidden={activeSection !== 'repository'}
                >
                    {repositoryMounted ? (
                        <Suspense fallback={null}>
                            <LazyLegalRepository
                                searchTerm={repositorySearchTerm}
                                selectedType={repositorySelectedType}
                                sortBy={repositorySortBy}
                                selectedTag={repositorySelectedTag}
                            />
                        </Suspense>
                    ) : null}
                </div>
                <div
                    data-testid="forum-section-groups"
                    className={activeSection === 'groups' ? 'block' : 'hidden'}
                    aria-hidden={activeSection !== 'groups'}
                >
                    {activeGroupId && activeGroup ? (
                        <ForumGroupFeedPanel
                            group={activeGroup}
                            onBack={onBackFromGroup}
                            onLeave={onLeaveGroup}
                            leaving={leavingGroup}
                            loadingPosts={groupPostsLoading}
                            hasMore={groupPostsHasMore}
                            loadingMore={groupPostsLoadingMore}
                            visiblePosts={groupVisiblePosts}
                            onLoadMore={onLoadMoreGroupPosts}
                            {...postListShared}
                        />
                    ) : (
                        <ForumGroupsDirectory
                            groups={groups}
                            loading={groupsLoading}
                            searchQuery={groupsSearchQuery}
                            onSearchQueryChange={onGroupsSearchQueryChange}
                            onJoin={onJoinGroup}
                            onOpenGroup={onOpenGroup}
                            onCreateClick={onCreateGroupClick}
                            joiningGroupId={joiningGroupId}
                        />
                    )}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 h-[180px] bg-gradient-to-t from-[#0E0812] via-[#140A18]/95 to-transparent pointer-events-none z-10" />

            {activeSection === 'forum' ? (
                <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-20">
                    <button
                        type="button"
                        data-testid="forum-add-question-fab"
                        onClick={onOpenAddQuestion}
                        onPointerEnter={prefetchCommunityAddQuestionOverlay}
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-lg transition-transform ${
                            currentUserId
                                ? `${FORUM_PUBLISH_BTN} shadow-black/25`
                                : FORUM_PUBLISH_BTN_DISABLED
                        }`}
                    >
                        <Plus size={20} />
                        <span>طرح استشارة للزملاء</span>
                    </button>
                </div>
            ) : activeSection === 'groups' && activeGroupId ? (
                <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-20">
                    <button
                        type="button"
                        data-testid="forum-add-question-fab"
                        onClick={onOpenAddQuestion}
                        onPointerEnter={prefetchCommunityAddQuestionOverlay}
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-lg transition-transform ${
                            currentUserId
                                ? `${FORUM_PUBLISH_BTN} shadow-black/25`
                                : FORUM_PUBLISH_BTN_DISABLED
                        }`}
                    >
                        <Plus size={20} />
                        <span>نشر في المجموعة</span>
                    </button>
                </div>
            ) : null}
        </>
    );
}

export function openForumAddQuestionGuard(currentUserId: string | null, onOpen: () => void): void {
    if (!currentUserId) {
        SmartToast.warning('سجّل الدخول أولاً');
        return;
    }
    onOpen();
}
