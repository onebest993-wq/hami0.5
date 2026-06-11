import React from 'react';
import { ChevronDown, Loader2, MessageSquare } from 'lucide-react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { QuestionCard } from './QuestionCard';

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
    onToggleLock?: (postId: string) => void;
    onMuteUser?: (userId: string) => void;
}

export const ForumPostList = ({
    loadingPosts, hasMore, loadingMore, visiblePosts,
    currentUserId, onToggleUpvote, onImageClick, onCommentClick,
    onDelete, onEdit, onReport, onShare,
    onLoadMore,
    isAdmin, onTogglePin, onFollow, followingIds, userStats,
    bookmarkedIds, onToggleBookmark, onToggleLock, onMuteUser,
}: ForumPostListProps) => {
    if (loadingPosts) {
        return (
            <div className="px-4 pb-4 space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`sk-${i}`} className="rounded-xl p-4 bg-white/5 border border-white/10">
                        <div className="h-4 w-40 bg-white/10 rounded mb-3 animate-pulse" />
                        <div className="h-4 w-full bg-white/10 rounded mb-2 animate-pulse" />
                        <div className="h-4 w-2/3 bg-white/10 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (visiblePosts.length === 0) {
        return (
            <div className="px-4 pb-4 space-y-4">
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={36} className="text-white/20" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">لا توجد استشارات حالياً</h3>
                    <p className="text-white/40 text-sm">كُن أول من يطرح نقاشاً قانونياً!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-4 space-y-4">
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
                    onToggleLock={onToggleLock}
                    onMuteUser={onMuteUser}
                />
            ))}

            {hasMore && (
                <div className="flex justify-center pt-2 pb-4">
                    <button type="button"
                        onClick={() => void onLoadMore()}
                        disabled={loadingMore}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            loadingMore
                                ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                : 'bg-[#25293C] border border-white/10 text-white/70 hover:text-white hover:border-white/20'
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
};
