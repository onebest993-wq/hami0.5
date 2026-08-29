import { Suspense } from 'react';

import {
    CommunityScreenForumFeedPane,
} from '@/app/components/lawyer/CommunityScreen/components/CommunityScreenForumFeedPane';
import type { CommunityScreenLazySectionPanesProps } from '@/app/components/lawyer/CommunityScreen/components/CommunityScreenLazySectionPanes.types';
import {
    LazyForumGroupsSection,
    LazyLegalRepository,
} from '@/app/components/lawyer/CommunityScreen/communityScreenLazySections';
import {
    FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS,
    forumLazySectionPaneClass,
    shouldMountForumLazySection,
} from '@/app/components/lawyer/CommunityScreen/forumLazySectionMount';

export type { CommunityScreenLazySectionPanesProps } from './CommunityScreenLazySectionPanes.types';

/** أقسام المنتدى/المستودع/المجموعات — نفس DOM والاختبارات البصرية */
export function CommunityScreenLazySectionPanes({
    activeSection,
    forumSurfaceOpen,
    forumFeedScope,
    onForumFeedScopeChange,
    followingCount,
    loadingPosts,
    hasMore,
    loadingMore,
    visiblePosts,
    onLoadMore,
    postListShared,
    repositoryMounted,
    groupsMounted,
    repositorySearchTerm,
    repositorySelectedType,
    repositorySortBy,
    repositorySelectedTag,
    activeGroupId,
    activeGroup,
    onBackFromGroup,
    onLeaveGroup,
    leavingGroup,
    groupPostsLoading,
    groupPostsHasMore,
    groupPostsLoadingMore,
    groupVisiblePosts,
    onLoadMoreGroupPosts,
    groups,
    groupsLoading,
    onJoinGroup,
    onOpenGroup,
    onCreateGroupClick,
    joiningGroupId,
}: CommunityScreenLazySectionPanesProps) {
    return (
        <>
            <div
                data-testid="forum-section-forum"
                className={activeSection === 'forum' ? 'block' : 'hidden'}
                aria-hidden={activeSection !== 'forum'}
            >
                {activeSection === 'forum' ? (
                    <CommunityScreenForumFeedPane
                        forumFeedScope={forumFeedScope}
                        onForumFeedScopeChange={onForumFeedScopeChange}
                        followingCount={followingCount}
                        loadingPosts={loadingPosts}
                        hasMore={hasMore}
                        loadingMore={loadingMore}
                        visiblePosts={visiblePosts}
                        onLoadMore={onLoadMore}
                        postListShared={postListShared}
                    />
                ) : null}
            </div>
            <div
                data-testid="forum-section-repository"
                className={forumLazySectionPaneClass(activeSection === 'repository')}
                aria-hidden={activeSection !== 'repository'}
            >
                {shouldMountForumLazySection(repositoryMounted, activeSection === 'repository') ? (
                    <Suspense
                        fallback={
                            <div
                                data-testid="forum-legal-repository"
                                className={FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS}
                                aria-busy="true"
                            />
                        }
                    >
                        <LazyLegalRepository
                            searchTerm={repositorySearchTerm}
                            selectedType={repositorySelectedType}
                            sortBy={repositorySortBy}
                            selectedTag={repositorySelectedTag}
                            surfaceOpen={forumSurfaceOpen}
                            repositoryActive={activeSection === 'repository'}
                        />
                    </Suspense>
                ) : null}
            </div>
            <div
                data-testid="forum-section-groups"
                className={forumLazySectionPaneClass(activeSection === 'groups')}
                aria-hidden={activeSection !== 'groups'}
            >
                {shouldMountForumLazySection(groupsMounted, activeSection === 'groups') ? (
                    <Suspense
                        fallback={
                            <div
                                data-testid="forum-groups-directory"
                                className={FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS}
                                aria-busy="true"
                            />
                        }
                    >
                        <LazyForumGroupsSection
                            activeGroupId={activeGroupId}
                            activeGroup={activeGroup}
                            onBackFromGroup={onBackFromGroup}
                            onLeaveGroup={onLeaveGroup}
                            leavingGroup={leavingGroup}
                            groupPostsLoading={groupPostsLoading}
                            groupPostsHasMore={groupPostsHasMore}
                            groupPostsLoadingMore={groupPostsLoadingMore}
                            groupVisiblePosts={groupVisiblePosts}
                            onLoadMoreGroupPosts={onLoadMoreGroupPosts}
                            groups={groups}
                            groupsLoading={groupsLoading}
                            onJoinGroup={onJoinGroup}
                            onOpenGroup={onOpenGroup}
                            onCreateGroupClick={onCreateGroupClick}
                            joiningGroupId={joiningGroupId}
                            {...postListShared}
                        />
                    </Suspense>
                ) : null}
            </div>
        </>
    );
}
