import { useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { mergeSortedCommunityPosts } from './communityPostFeedUtils';

type UseCommunityPostsFeedPagingParams = {
    pageSize: number;
    postsRef: { current: CommunityPost[] };
    applyPostsUpdate: (updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    loadingMore: boolean;
    hasMore: boolean;
    setLoadingMore: (value: boolean) => void;
    setHasMore: (value: boolean) => void;
};

export function useCommunityPostsFeedPaging({
    pageSize,
    postsRef,
    applyPostsUpdate,
    loadingMore,
    hasMore,
    setLoadingMore,
    setHasMore,
}: UseCommunityPostsFeedPagingParams) {
    const refreshPosts = useCallback(
        async (silent = false) => {
            try {
                const limit = Math.max(pageSize, postsRef.current.length || pageSize);
                const { posts: page } = await ForumApiService.listPostsPaginated(limit, 0);
                applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, page));
                setHasMore(page.length >= limit);
            } catch {
                if (!silent) SmartToast.error('تعذّر تحديث المنشورات');
            }
        },
        [applyPostsUpdate, pageSize, postsRef, setHasMore],
    );

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const { posts: nextPage } = await ForumApiService.listPostsPaginated(
                pageSize,
                postsRef.current.length,
            );
            applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, nextPage));
            setHasMore(nextPage.length === pageSize);
        } catch {
            SmartToast.error('تعذّر جلب المزيد من المنشورات');
        } finally {
            setLoadingMore(false);
        }
    }, [applyPostsUpdate, hasMore, loadingMore, pageSize, postsRef, setHasMore, setLoadingMore]);

    return { refreshPosts, handleLoadMore };
}
