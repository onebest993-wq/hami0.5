import React, { memo } from 'react';
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { QuestionCard } from './QuestionCard';
import {
    FORUM_GHOST_BTN,
    FORUM_INTERACT_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

interface ForumPostListProps {
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    currentUserId: string | null;
    onToggleUpvote: (postId: string) => void;
    onImageClick: (url: string) => void;
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
    onSaveToNotes?: (postId: string) => void;
    onSaveToVault?: (postId: string) => void;
    onToggleLock?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
    emptyHint?: string;
    threadFollowingIds?: Set<string>;
    onToggleThreadFollow?: (postId: string) => void;
}

export const ForumPostList = memo(function ForumPostList({
    loadingPosts, hasMore, loadingMore, visiblePosts,
    currentUserId, onToggleUpvote, onImageClick, onCommentClick,
    onDelete, onEdit, onReport, onShare,
    onLoadMore,
    isAdmin, onTogglePin, onFollow, followingIds, userStats,
    bookmarkedIds, onToggleBookmark, onSaveToNotes, onSaveToVault, onToggleLock, onMuteUser,
    emptyHint,
    threadFollowingIds,
    onToggleThreadFollow,
}: ForumPostListProps) {
    if (visiblePosts.length === 0) {
        return (
            <div className="px-4 pb-4 space-y-4">
                <div className="py-14 text-center">
                    {loadingPosts ? (
                        <>
                            <Loader2 size={36} className="text-[#F0B896]/40 animate-spin mx-auto mb-4" aria-hidden />
                            <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-2`}>جاري تحميل المنشورات...</h3>
                            <p className={`${FORUM_TEXT_MUTED} text-sm`}>سيظهر المنتدى خلال لحظات</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-[#342C3A] border border-[#4A3D52]/40 flex items-center justify-center mx-auto mb-4">
                                <MessageSquare size={36} className="text-[#F0B896]/30" />
                            </div>
                            <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-2`}>لا توجد استشارات حالياً</h3>
                            <p className={`${FORUM_TEXT_MUTED} text-sm`}>
                                {emptyHint ?? 'كُن أول من يطرح نقاشاً قانونياً!'}
                            </p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 space-y-4">
            {loadingPosts ? (
                <div className="flex items-center justify-center gap-2 py-1 text-[#F0B896]/50 text-[11px] font-bold">
                    <Loader2 size={14} className="animate-spin shrink-0" aria-hidden />
                    <span>جاري التحديث...</span>
                </div>
            ) : null}
            {visiblePosts.map((post) => (
                <QuestionCard
                    key={post.id}
                    post={post}
                    currentUserId={currentUserId}
                    onToggleUpvote={onToggleUpvote}
                    onImageClick={onImageClick}
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
                    onSaveToNotes={onSaveToNotes}
                    onSaveToVault={onSaveToVault}
                    onToggleLock={onToggleLock}
                    onMuteUser={onMuteUser}
                    isThreadFollowing={threadFollowingIds?.has(post.id) ?? false}
                    onToggleThreadFollow={onToggleThreadFollow}
                />
            ))}

            {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                    <button
                        type="button"
                        onClick={() => void onLoadMore()}
                        disabled={loadingMore}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all ${
                            loadingMore
                                ? FORUM_PUBLISH_BTN_DISABLED + ' rounded-xl'
                                : FORUM_GHOST_BTN + ' ' + FORUM_INTERACT_BTN
                        }`}
                    >
                        {loadingMore ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                جاري التحميل...
                            </>
                        ) : (
                            <>
                                <span>تحميل المزيد</span>
                                <ChevronDown size={16} />
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
});
