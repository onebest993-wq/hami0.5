import { Suspense } from 'react';

import { ForumAppBar } from '@/app/components/lawyer/CommunityScreen/components/ForumAppBar';
import { LazyForumFollowingPanel } from '@/app/components/lawyer/CommunityScreen/communityScreenLazySections';
import { ForumPublishFab } from './ForumPublishFab';
import { shouldShowForumFeedPublishFab } from '@/app/components/lawyer/CommunityScreen/forumFeedPublishVisibility';
import { prefetchCommunityAddQuestionOverlay } from '@/app/components/lawyer/CommunityScreen/communityOverlayPrefetch';
import { HomePlusIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import type { CommunitySection } from '@/app/components/lawyer/CommunityScreen/communitySectionState';
import type { CommunityScreenBodyProps } from './CommunityScreenBody.types';

type CommunityScreenBodyChromeProps = Pick<
    CommunityScreenBodyProps,
    | 'onBack'
    | 'forumSurfaceOpen'
    | 'activeSection'
    | 'onSectionChange'
    | 'onSearchOpen'
    | 'onNavigateToPost'
    | 'currentUserId'
    | 'selectedFilterIndex'
    | 'onFilterSelect'
    | 'repositorySearchTerm'
    | 'onRepositorySearchTermChange'
    | 'repositorySortBy'
    | 'onRepositorySortChange'
    | 'repositorySelectedType'
    | 'onRepositoryTypeChange'
    | 'repositorySelectedTag'
    | 'onRepositoryTagChange'
    | 'groupsSearchQuery'
    | 'onGroupsSearchQueryChange'
    | 'followingRecords'
    | 'onOpenFollowing'
    | 'forumFeedScope'
    | 'onForumFeedScopeChange'
    | 'forumStreamConnected'
    | 'onAppBarDropdownChange'
    | 'closeAppBarDropdownsRef'
    | 'showFollowingPanel'
    | 'onCloseFollowingPanel'
    | 'followerRecords'
    | 'followingAuthorNames'
    | 'onUnfollow'
    | 'onFollowBack'
    | 'onUpdateFollowPrefs'
    | 'onOpenFollowingFeed'
    | 'onOpenProfile'
    | 'activeGroupId'
    | 'onOpenAddQuestion'
    | 'canPublishPost'
> & {
    onSectionIntent: (section: CommunitySection) => void;
};

export function CommunityScreenBodyChrome(props: CommunityScreenBodyChromeProps) {
    const forumSurfaceOpen = props.forumSurfaceOpen ?? true;

    return (
        <>
            <ForumAppBar
                onBack={props.onBack}
                forumSurfaceOpen={forumSurfaceOpen}
                activeSection={props.activeSection}
                onSectionChange={props.onSectionChange}
                onSectionIntent={props.onSectionIntent}
                onSearchOpen={props.onSearchOpen}
                onNavigateToPost={props.onNavigateToPost}
                userId={props.currentUserId}
                selectedFilterIndex={props.selectedFilterIndex}
                onFilterSelect={props.onFilterSelect}
                repositorySearchTerm={props.repositorySearchTerm}
                onRepositorySearchTermChange={props.onRepositorySearchTermChange}
                repositorySortBy={props.repositorySortBy}
                onRepositorySortChange={props.onRepositorySortChange}
                repositorySelectedType={props.repositorySelectedType}
                onRepositoryTypeChange={props.onRepositoryTypeChange}
                repositorySelectedTag={props.repositorySelectedTag}
                onRepositoryTagChange={props.onRepositoryTagChange}
                groupsSearchQuery={props.groupsSearchQuery}
                onGroupsSearchQueryChange={props.onGroupsSearchQueryChange}
                followingCount={props.followingRecords.length}
                onOpenFollowing={props.onOpenFollowing}
                forumFeedScope={props.forumFeedScope}
                onForumFeedScopeChange={props.onForumFeedScopeChange}
                notificationStreamActive={props.forumStreamConnected}
                onAppBarDropdownChange={props.onAppBarDropdownChange}
                closeAppBarDropdownsRef={props.closeAppBarDropdownsRef}
            />

            {props.showFollowingPanel ? (
                <Suspense fallback={null}>
                    <LazyForumFollowingPanel
                        open
                        onClose={props.onCloseFollowingPanel}
                        following={props.followingRecords}
                        followers={props.followerRecords}
                        authorNames={props.followingAuthorNames}
                        onUnfollow={props.onUnfollow}
                        onFollowBack={props.onFollowBack}
                        onUpdatePrefs={props.onUpdateFollowPrefs}
                        onOpenFollowingFeed={props.onOpenFollowingFeed}
                        onOpenProfile={props.onOpenProfile}
                    />
                </Suspense>
            ) : null}

            {shouldShowForumFeedPublishFab(props.activeSection, props.activeGroupId) ? (
                <ForumPublishFab
                    label="النشر"
                    testId="forum-add-question-fab"
                    onClick={props.onOpenAddQuestion}
                    onPointerEnter={prefetchCommunityAddQuestionOverlay}
                    disabled={!props.canPublishPost}
                    icon={<HomePlusIcon size={20} strokeWidth={2.5} />}
                />
            ) : null}
        </>
    );
}
