import type { CommunityScreenBodyProps } from './CommunityScreenBody.types';
import type { ForumPostListSharedProps } from './ForumPostList';

export function pickForumPostListShared(props: CommunityScreenBodyProps): ForumPostListSharedProps {
    return {
        currentUserId: props.currentUserId,
        onToggleUpvote: props.onToggleUpvote,
        onCommentClick: props.onCommentClick,
        onDelete: props.onDelete,
        onEdit: props.onEdit,
        onReport: props.onReport,
        onShare: props.onShare,
        isAdmin: props.isAdmin,
        onTogglePin: props.onTogglePin,
        onFollow: props.onFollow,
        followingIds: props.followingIds,
        bookmarkedIds: props.bookmarkedIds,
        onToggleBookmark: props.onToggleBookmark,
        onCopyPostText: props.onCopyPostText,
        onSaveToVault: props.onSaveToVault,
        onSaveToDevice: props.onSaveToDevice,
        onToggleLock: props.onToggleLock,
        onMuteUser: props.onMuteUser,
        userStats: props.userStats,
        threadFollowingIds: props.threadFollowingIds,
        onToggleThreadFollow: props.onToggleThreadFollow,
        onOpenProfile: props.onOpenProfile,
    };
}
