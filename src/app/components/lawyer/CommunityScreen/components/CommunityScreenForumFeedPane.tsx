import { ForumPostList, type ForumPostListSharedProps } from '@/app/components/lawyer/CommunityScreen/components/ForumPostList';
import { FORUM_CONTENT_COLUMN } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

type CommunityScreenForumFeedPaneProps = {
    forumFeedScope: 'all' | 'following';
    onForumFeedScopeChange: (scope: 'all' | 'following') => void;
    followingCount: number;
    loadingPosts: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    visiblePosts: CommunityPost[];
    onLoadMore: () => void;
    postListShared: ForumPostListSharedProps;
};

export function CommunityScreenForumFeedPane({
    forumFeedScope,
    onForumFeedScopeChange,
    followingCount,
    loadingPosts,
    hasMore,
    loadingMore,
    visiblePosts,
    onLoadMore,
    postListShared,
}: CommunityScreenForumFeedPaneProps) {
    return (
        <>
            {forumFeedScope === 'following' ? (
                <div className={`${FORUM_CONTENT_COLUMN} pt-2 pb-1 flex items-center justify-between gap-2`}>
                    <p className="text-[#E6C673]/80 text-[11px] font-bold">عرض منشورات المحامين الذين تتابعهم</p>
                    <button
                        type="button"
                        onClick={() => onForumFeedScopeChange('all')}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[10px] text-[#9AA3B2] hover:text-[#E6C673] font-bold touch-manipulation"
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
                        ? followingCount === 0
                            ? 'تابع محامياً لعرض منشوراته هنا'
                            : 'لا منشورات جديدة من المحامين الذين تتابعهم'
                        : undefined
                }
                onLoadMore={onLoadMore}
                {...postListShared}
            />
        </>
    );
}
