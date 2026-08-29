import { Suspense } from 'react';

import {
    LazyCommentBottomSheet,
    LazyForumMemberProfileOverlay,
    LazySearchOverlay,
} from '@/app/components/lawyer/CommunityScreen/communityScreenLazyEntries';
import type { CommunityScreenOverlaysProps } from './CommunityScreenOverlays.types';

export function CommunityScreenBrowseMidOverlays(props: CommunityScreenOverlaysProps) {
    const {
        activePostForComments,
        currentUserId,
        isAdmin,
        followingIds,
        userStats,
        mutedIds,
        forumMentionCandidates,
        onCloseComments,
        onAddComment,
        onToggleBestAnswer,
        onDeleteComment,
        onEditComment,
        onFollow,
        onToggleCommentUpvote,
        onReportComment,
        onMuteUser,
        onOpenProfile,
        isSearchOpen,
        searchQuery,
        onSearchQueryChange,
        filterHasPdf,
        onFilterHasPdfChange,
        filterHasImage,
        onFilterHasImageChange,
        selectedTag,
        onSelectedTagChange,
        allSearchTags,
        filteredPosts,
        filteredRepositoryDocs,
        onCloseSearch,
        onOpenPost,
        onOpenDocument,
    } = props;

    return (
        <>
            {activePostForComments ? (
                <Suspense fallback={null}>
                    <LazyCommentBottomSheet
                        post={activePostForComments}
                        onClose={onCloseComments}
                        onAddComment={onAddComment}
                        currentUserId={currentUserId ?? ''}
                        onToggleBestAnswer={onToggleBestAnswer}
                        onDeleteComment={onDeleteComment}
                        onEditComment={onEditComment}
                        onFollow={onFollow}
                        followingIds={followingIds}
                        userStats={userStats}
                        isAdmin={isAdmin}
                        onToggleCommentUpvote={onToggleCommentUpvote}
                        onReportComment={onReportComment}
                        onMuteUser={onMuteUser}
                        mutedUserIds={mutedIds}
                        mentionCandidates={forumMentionCandidates}
                        onOpenProfile={onOpenProfile}
                    />
                </Suspense>
            ) : null}

            {isSearchOpen ? (
                <Suspense fallback={null}>
                    <LazySearchOverlay
                        isOpen={isSearchOpen}
                        searchQuery={searchQuery}
                        onSearchQueryChange={onSearchQueryChange}
                        filterHasPdf={filterHasPdf}
                        onFilterHasPdfChange={onFilterHasPdfChange}
                        filterHasImage={filterHasImage}
                        onFilterHasImageChange={onFilterHasImageChange}
                        selectedTag={selectedTag}
                        onSelectedTagChange={onSelectedTagChange}
                        allTags={allSearchTags}
                        filteredPosts={filteredPosts}
                        filteredDocuments={filteredRepositoryDocs}
                        onClose={onCloseSearch}
                        onOpenPost={onOpenPost}
                        onOpenDocument={onOpenDocument}
                    />
                </Suspense>
            ) : null}
        </>
    );
}

export function CommunityScreenBrowseProfileOverlay(props: CommunityScreenOverlaysProps) {
    const {
        profileView,
        onCloseProfile,
        currentUserId,
        followingIds,
        userStats,
        onFollow,
        followBusyUserId,
    } = props;

    if (!profileView) return null;

    return (
        <Suspense fallback={null}>
            <LazyForumMemberProfileOverlay
                userId={profileView.userId}
                displayName={profileView.displayName}
                onBack={onCloseProfile}
                forumFollow={
                    currentUserId && profileView.userId !== currentUserId
                        ? {
                              isFollowing: followingIds.has(profileView.userId),
                              followerCount: userStats[profileView.userId]?.followerCount,
                              postCount: userStats[profileView.userId]?.postCount,
                              onToggle: () => onFollow(profileView.userId),
                              busy: followBusyUserId === profileView.userId,
                          }
                        : undefined
                }
            />
        </Suspense>
    );
}
