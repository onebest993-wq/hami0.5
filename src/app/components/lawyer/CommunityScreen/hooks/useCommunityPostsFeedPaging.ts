import { useCallback, useRef } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { withForumAsyncTimeout } from '../forumAsync';
import { areCommunityPostListsEquivalent, mergeSortedCommunityPosts } from './communityPostFeedUtils';

const SILENT_POSTS_TIMEOUT_MS = 15_000;

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
    const silentInflightRef = useRef(false);
    const paginationOffsetRef = useRef(0);

    const refreshPosts = useCallback(
        async (silent = false) => {
            if (silent && silentInflightRef.current) return;
            if (silent) silentInflightRef.current = true;
            try {
                const limit = silent ? pageSize : Math.max(pageSize, postsRef.current.length || pageSize);
                let page: CommunityPost[];
                if (silent) {
                    let timedOut = false;
                    const result = await withForumAsyncTimeout(
                        ForumApiService.listPostsPaginated(limit, 0),
                        SILENT_POSTS_TIMEOUT_MS,
                        () => {
                            timedOut = true;
                            return { posts: [] as CommunityPost[], total: 0 };
                        },
                    );
                    if (timedOut) return;
                    page = result.posts;
                } else {
                    ({ posts: page } = await ForumApiService.listPostsPaginated(limit, 0));
                }
                applyPostsUpdate((prev) => {
                    const next = mergeSortedCommunityPosts(prev, page);
                    return areCommunityPostListsEquivalent(prev, next) ? prev : next;
                });
                if (!silent) {
                    setHasMore(page.length >= limit);
                    paginationOffsetRef.current = page.length;
                } else if (paginationOffsetRef.current === 0 && page.length > 0) {
                    paginationOffsetRef.current = Math.min(page.length, limit);
                }
            } catch {
                if (!silent) SmartToast.error('تعذّر تحديث المنشورات');
            } finally {
                if (silent) silentInflightRef.current = false;
            }
        },
        [applyPostsUpdate, pageSize, postsRef, setHasMore],
    );

    const acknowledgeServerPage = useCallback((fetchedCount: number) => {
        if (fetchedCount > 0 && paginationOffsetRef.current === 0) {
            paginationOffsetRef.current = fetchedCount;
        }
    }, []);

    const handleLoadMore = useCallback(async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const offset = paginationOffsetRef.current;
            const { posts: nextPage } = await ForumApiService.listPostsPaginated(pageSize, offset);
            applyPostsUpdate((prev) => {
                const next = mergeSortedCommunityPosts(prev, nextPage);
                return areCommunityPostListsEquivalent(prev, next) ? prev : next;
            });
            paginationOffsetRef.current = offset + nextPage.length;
            setHasMore(nextPage.length === pageSize);
        } catch {
            SmartToast.error('تعذّر جلب المزيد من المنشورات');
        } finally {
            setLoadingMore(false);
        }
    }, [applyPostsUpdate, hasMore, loadingMore, pageSize, setHasMore, setLoadingMore]);

    return { refreshPosts, handleLoadMore, acknowledgeServerPage };
}
