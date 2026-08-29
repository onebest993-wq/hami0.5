import { useRef } from 'react';

import { CommunityScreenLazySectionPanes } from '@/app/components/lawyer/CommunityScreen/components/CommunityScreenLazySectionPanes';
import { useCommunityScreenLazySectionMount } from '@/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenLazySectionMount';
import { useForumSectionSwipe } from '@/app/components/lawyer/CommunityScreen/hooks/useForumSectionSwipe';
import { useForumSectionScrollMemory } from '@/app/components/lawyer/CommunityScreen/hooks/useForumSectionScrollMemory';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { CommunityScreenBodyChrome } from './CommunityScreenBodyChrome';
import { pickForumPostListShared } from './pickForumPostListShared';
import type { CommunityScreenBodyProps } from './CommunityScreenBody.types';

export type { CommunityScreenBodyProps } from './CommunityScreenBody.types';

/** جسم المنتدى: الشريط + الأقسام الثلاثة + FAB */
export function CommunityScreenBody(props: CommunityScreenBodyProps) {
    const forumSurfaceOpen = props.forumSurfaceOpen ?? true;
    const { repositoryMounted, groupsMounted, warmLazySection } = useCommunityScreenLazySectionMount(
        props.activeSection,
        forumSurfaceOpen,
    );

    const sectionSwipeContainerRef = useRef<HTMLDivElement | null>(null);
    useForumSectionScrollMemory(sectionSwipeContainerRef, props.activeSection);
    const keyboardInset = useMobileKeyboardInset(forumSurfaceOpen);
    const sectionSwipeEnabled =
        forumSurfaceOpen &&
        !props.showFollowingPanel &&
        !(props.activeSection === 'groups' && props.activeGroupId) &&
        keyboardInset === 0;
    const { swipeHandlers } = useForumSectionSwipe(sectionSwipeContainerRef, {
        activeSection: props.activeSection,
        onSectionChange: (section) => {
            warmLazySection(section);
            props.onSectionChange(section);
        },
        enabled: sectionSwipeEnabled,
    });

    const postListShared = pickForumPostListShared(props);

    return (
        <>
            <CommunityScreenBodyChrome {...props} onSectionIntent={warmLazySection} />

            <div
                ref={sectionSwipeContainerRef}
                data-testid="forum-section-swipe-surface"
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide pb-36 touch-pan-y"
                {...swipeHandlers}
            >
                <CommunityScreenLazySectionPanes
                    activeSection={props.activeSection}
                    forumSurfaceOpen={forumSurfaceOpen}
                    forumFeedScope={props.forumFeedScope}
                    onForumFeedScopeChange={props.onForumFeedScopeChange}
                    followingCount={props.followingRecords.length}
                    loadingPosts={props.loadingPosts}
                    hasMore={props.hasMore}
                    loadingMore={props.loadingMore}
                    visiblePosts={props.visiblePosts}
                    onLoadMore={props.onLoadMore}
                    postListShared={postListShared}
                    repositoryMounted={repositoryMounted}
                    groupsMounted={groupsMounted}
                    repositorySearchTerm={props.repositorySearchTerm}
                    repositorySelectedType={props.repositorySelectedType}
                    repositorySortBy={props.repositorySortBy}
                    repositorySelectedTag={props.repositorySelectedTag}
                    activeGroupId={props.activeGroupId}
                    activeGroup={props.activeGroup}
                    onBackFromGroup={props.onBackFromGroup}
                    onLeaveGroup={props.onLeaveGroup}
                    leavingGroup={props.leavingGroup}
                    groupPostsLoading={props.groupPostsLoading}
                    groupPostsHasMore={props.groupPostsHasMore}
                    groupPostsLoadingMore={props.groupPostsLoadingMore}
                    groupVisiblePosts={props.groupVisiblePosts}
                    onLoadMoreGroupPosts={props.onLoadMoreGroupPosts}
                    groups={props.groups}
                    groupsLoading={props.groupsLoading}
                    onJoinGroup={props.onJoinGroup}
                    onOpenGroup={props.onOpenGroup}
                    onCreateGroupClick={props.onCreateGroupClick}
                    joiningGroupId={props.joiningGroupId}
                />
            </div>
        </>
    );
}
