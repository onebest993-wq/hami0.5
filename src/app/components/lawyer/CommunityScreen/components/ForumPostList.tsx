import { memo } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { QuestionCard } from './QuestionCard';
import { ForumLazySectionInstantSlots } from './ForumLazySectionInstantSlots';
import { useForumFeedWindow } from '../hooks/useForumFeedWindow';
import {
    FORUM_CONTENT_COLUMN,
    FORUM_GHOST_BTN,
    FORUM_INTERACT_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_TEXT_MUTED,
} from '../forumPlumTheme';

export type ForumPostListProps = {
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    currentUserId: string | null;
    onToggleUpvote: (postId: string) => void;
    onCommentClick: (id: string) => void;
    onDelete: (postId: string) => void;
    onEdit: (postId: string) => void;
    onReport: (postId: string) => void;
    onShare: (postId: string) => void;
    onLoadMore: () => void;
    isAdmin: boolean;
    onTogglePin: (postId: string) => void;
    onFollow: (targetUserId: string) => void;
    followingIds: Set<string>;
    userStats: Record<string, { followerCount: number; postCount: number }>;
    bookmarkedIds?: Set<string>;
    onToggleBookmark?: (postId: string) => void;
    onCopyPostText?: (postId: string) => void;
    onSaveToVault?: (postId: string) => void;
    onSaveToDevice?: (postId: string) => void;
    onToggleLock?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
    emptyHint?: string;
    threadFollowingIds?: Set<string>;
    onToggleThreadFollow?: (postId: string) => void;
    onOpenProfile?: (userId: string, displayName?: string) => void;
};

export type ForumPostListSharedProps = Omit<
    ForumPostListProps,
    'visiblePosts' | 'loadingPosts' | 'hasMore' | 'loadingMore' | 'onLoadMore' | 'emptyHint'
>;

export const ForumPostList = memo(function ForumPostList({
    loadingPosts, hasMore, loadingMore, visiblePosts,
    currentUserId, onToggleUpvote, onCommentClick,
    onDelete, onEdit, onReport, onShare,
    onLoadMore,
    isAdmin, onTogglePin, onFollow, followingIds, userStats,
    bookmarkedIds, onToggleBookmark, onCopyPostText, onSaveToVault, onSaveToDevice, onToggleLock, onMuteUser,
    emptyHint,
    threadFollowingIds,
    onToggleThreadFollow,
    onOpenProfile,
}: ForumPostListProps) {
    const { windowedPosts, sentinelRef, hiddenCount } = useForumFeedWindow(visiblePosts);

    if (visiblePosts.length === 0) {
        return (
            <div
                className={`${FORUM_CONTENT_COLUMN} pb-24 space-y-3`}
                data-testid="forum-post-list"
                aria-busy={loadingPosts || undefined}
            >
                {loadingPosts ? (
                    <ForumLazySectionInstantSlots framed={false} />
                ) : (
                    <div
                        className="flex flex-col items-center justify-end px-3 pb-6 pt-12 text-center"
                        data-testid="forum-post-empty"
                    >
                        <p className={`${FORUM_TEXT_MUTED} text-sm max-w-xs`}>
                            {emptyHint ?? 'لا منشورات بعد — اطرح أول استشارة من زر النشر.'}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={`${FORUM_CONTENT_COLUMN} pb-4 space-y-3`} data-testid="forum-post-list">
            {windowedPosts.map((post, index) => (
                <div
                    key={post.id}
                    style={
                        index > 1
                            ? { contentVisibility: 'auto', containIntrinsicSize: '0 280px' }
                            : undefined
                    }
                >
                <QuestionCard
                    post={post}
                    currentUserId={currentUserId}
                    onToggleUpvote={onToggleUpvote}
                    onCommentClick={onCommentClick}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onReport={onReport}
                    onShare={onShare}
                    isAdmin={isAdmin}
                    onTogglePin={onTogglePin}
                    onFollow={onFollow}
                    followingIds={followingIds}
                    userStats={userStats}
                    isBookmarked={bookmarkedIds?.has(post.id) ?? false}
                    onToggleBookmark={onToggleBookmark}
                    onCopyPostText={onCopyPostText}
                    onSaveToVault={onSaveToVault}
                    onSaveToDevice={onSaveToDevice}
                    onToggleLock={onToggleLock}
                    onMuteUser={onMuteUser}
                    isThreadFollowing={threadFollowingIds?.has(post.id) ?? false}
                    onToggleThreadFollow={onToggleThreadFollow}
                    onOpenProfile={onOpenProfile}
                    preferEagerImage={index < 2}
                />
                </div>
            ))}

            {hiddenCount > 0 ? (
                <div ref={sentinelRef} className="h-1" aria-hidden data-testid="forum-feed-window-sentinel" />
            ) : null}

            {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                    <button
                        type="button"
                        onClick={() => void onLoadMore()}
                        disabled={loadingMore}
                        className={`flex min-h-[44px] items-center gap-2 px-6 py-3 text-sm font-bold transition-all touch-manipulation ${
                            loadingMore
                                ? FORUM_PUBLISH_BTN_DISABLED + ' rounded-xl'
                                : FORUM_GHOST_BTN + ' ' + FORUM_INTERACT_BTN
                        }`}
                        aria-busy={loadingMore || undefined}
                    >
                        <span>تحميل المزيد</span>
                        {loadingMore ? null : <ChevronDown size={16} />}
                    </button>
                </div>
            )}
        </div>
    );
});
