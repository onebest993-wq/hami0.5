import type { CommunityPost } from '@/app/services/lawyer-cloud';
import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import { ForumGroupFeedPanel } from '@/app/components/lawyer/CommunityScreen/components/ForumGroupFeedPanel';
import { ForumGroupsDirectory } from '@/app/components/lawyer/CommunityScreen/components/ForumGroupsDirectory';
import type { ForumPostListSharedProps } from '@/app/components/lawyer/CommunityScreen/components/ForumPostList';

export type ForumGroupsSectionProps = ForumPostListSharedProps & {
    activeGroupId: string | null;
    activeGroup: ForumGroup | null;
    onBackFromGroup: () => void;
    onLeaveGroup: () => void;
    leavingGroup: boolean;
    groupPostsLoading: boolean;
    groupPostsHasMore: boolean;
    groupPostsLoadingMore: boolean;
    groupVisiblePosts: CommunityPost[];
    onLoadMoreGroupPosts: () => void;
    groups: ForumGroup[];
    groupsLoading: boolean;
    onJoinGroup: (groupId: string) => void;
    onOpenGroup: (groupId: string) => void;
    onCreateGroupClick: () => void;
    joiningGroupId: string | null;
};

export default function ForumGroupsSection({
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
    ...postListShared
}: ForumGroupsSectionProps) {
    if (activeGroupId && activeGroup) {
        return (
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
        );
    }

    return (
        <ForumGroupsDirectory
            groups={groups}
            loading={groupsLoading}
            onJoin={onJoinGroup}
            onOpenGroup={onOpenGroup}
            onCreateClick={onCreateGroupClick}
            joiningGroupId={joiningGroupId}
        />
    );
}
