import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { hasAnyActiveUrgentConsultation } from '@/app/services/forum/forumUrgentConsultation';
import { FORUM_FILTER_LABELS } from '../forumFilters';
import {
    COMMUNITY_POSTS_MAX_RETAINED,
    COMMUNITY_POSTS_PAGE_SIZE,
} from '../communityScreenConstants';
import { resolveCommunityForumPollMs } from '../communityFeedPolicy';
import type { CommunitySection } from '../communitySectionState';
import type { CommunityDualPostLists } from './useCommunityDualPostLists';
import {
    computeVisibleCommunityPosts,
    mergeSortedCommunityPosts,
    normalizeCommunityPostsPage,
    trimCommunityPostsRetention,
} from './communityPostFeedUtils';
import { peekForumPostsCache, readForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { withForumAsyncTimeout } from '../forumAsync';

const LOCAL_HYDRATE_TIMEOUT_MS = 3_000;
const CACHE_HYDRATE_TIMEOUT_MS = 2_000;
const REMOTE_FETCH_TIMEOUT_MS = 8_000;

export type UseCommunityPostsFeedParams = {
    lists: Pick<CommunityDualPostLists, 'posts' | 'setPosts' | 'postsRef'>;
    mutedIds: Set<string>;
    currentUserId: string | null;
    followingIds: Set<string>;
    forumFeedScope: 'all' | 'following';
    selectedFilterIndex: number;
    authIsLoading: boolean;
    activeSection: CommunitySection;
    /** keepAlive مغلق: لا polling */
    surfaceOpen?: boolean;
    initialPostId?: string | null;
    initialOpenComments?: boolean;
    onOpenComments?: (postId: string) => void;
    onActivateForumSection?: () => void;
};

export function useCommunityPostsFeed({
    lists,
    mutedIds,
    currentUserId,
    followingIds,
    forumFeedScope,
    selectedFilterIndex,
    authIsLoading,
    activeSection,
    surfaceOpen = true,
    initialPostId = null,
    initialOpenComments = false,
    onOpenComments,
    onActivateForumSection,
}: UseCommunityPostsFeedParams) {
    const { posts, setPosts, postsRef } = lists;
    const [loadingPosts, setLoadingPosts] = useState(() => !(peekForumPostsCache()?.length));
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [urgentPriorityTick, setUrgentPriorityTick] = useState(0);
    const postsBootstrappedRef = useRef(false);
    const deepLinkHandledRef = useRef(false);
    const pageSize = COMMUNITY_POSTS_PAGE_SIZE;
    const forumPollMs = resolveCommunityForumPollMs();

    const applyPostsUpdate = useCallback(
        (updater: (prev: CommunityPost[]) => CommunityPost[]) => {
            setPosts((prev) => trimCommunityPostsRetention(updater(prev), COMMUNITY_POSTS_MAX_RETAINED));
        },
        [setPosts],
    );

    useEffect(() => {
        if (postsBootstrappedRef.current) return;
        let cancelled = false;
        let showedBlockingLoader = false;

        const clearBlockingLoader = () => {
            if (showedBlockingLoader && !cancelled) {
                setLoadingPosts(false);
            }
        };

        const fetchRemotePage = async () => {
            const { posts: page } = await ForumApiService.listPostsPaginated(pageSize, 0);
            if (cancelled) return;
            postsBootstrappedRef.current = true;
            applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, page));
            setHasMore(page.length === pageSize);
        };

        const runBootstrap = async () => {
            let hydratedCount = 0;

            const syncCached = peekForumPostsCache();
            if (syncCached && syncCached.length > 0) {
                applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, syncCached));
                hydratedCount += syncCached.length;
            }

            const warmed = await withForumAsyncTimeout(readForumPostsCache(), CACHE_HYDRATE_TIMEOUT_MS, []);
            if (!cancelled && warmed.length > 0) {
                applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, warmed));
                hydratedCount = Math.max(hydratedCount, warmed.length);
            }

            try {
                const local = await withForumAsyncTimeout(CommunityDB.listPosts(), LOCAL_HYDRATE_TIMEOUT_MS, []);
                const scoped = sortCommunityPosts(local).filter((p) => !p.groupId);
                if (!cancelled && scoped.length > 0) {
                    applyPostsUpdate((prev) => mergeSortedCommunityPosts(prev, scoped));
                    hydratedCount = Math.max(hydratedCount, scoped.length);
                }
            } catch {
                /* ignore local hydrate */
            }

            if (cancelled) return;

            if (hydratedCount > 0) {
                postsBootstrappedRef.current = true;
            } else {
                showedBlockingLoader = true;
                setLoadingPosts(true);
            }

            try {
                await withForumAsyncTimeout(fetchRemotePage(), REMOTE_FETCH_TIMEOUT_MS, undefined);
            } catch {
                if (!cancelled && postsRef.current.length === 0) {
                    SmartToast.error('تعذّر جلب منشورات المنتدى');
                }
            } finally {
                if (!cancelled) {
                    postsBootstrappedRef.current = true;
                    clearBlockingLoader();
                }
            }
        };

        void runBootstrap();
        return () => {
            cancelled = true;
            clearBlockingLoader();
        };
    }, [applyPostsUpdate, pageSize, postsRef]);

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
        [applyPostsUpdate, pageSize, postsRef],
    );

    const forumPollEnabled =
        surfaceOpen !== false && !authIsLoading && activeSection === 'forum';
    useVisibilityAwareInterval(() => {
        void refreshPosts(true);
    }, forumPollMs, forumPollEnabled);

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
    }, [applyPostsUpdate, hasMore, loadingMore, pageSize, postsRef]);

    useEffect(() => {
        if (!hasAnyActiveUrgentConsultation(posts)) return;
        const timerId = window.setInterval(() => {
            setUrgentPriorityTick((value) => value + 1);
        }, 60_000);
        return () => window.clearInterval(timerId);
    }, [posts]);

    useEffect(() => {
        if (!initialPostId || loadingPosts || deepLinkHandledRef.current) return;
        let cancelled = false;
        void (async () => {
            let target = postsRef.current.find((p) => p.id === initialPostId) ?? null;
            if (!target) {
                target = await ForumApiService.getPostById(initialPostId);
                if (target && !cancelled) {
                    const resolved = normalizeCommunityPostsPage([target])[0]!;
                    applyPostsUpdate((prev) =>
                        prev.some((p) => p.id === resolved.id) ? prev : [resolved, ...prev],
                    );
                }
            }
            if (cancelled || !target) return;
            onActivateForumSection?.();
            if (initialOpenComments) {
                onOpenComments?.(initialPostId);
            }
            deepLinkHandledRef.current = true;
            requestAnimationFrame(() => {
                document.getElementById(`forum-post-${initialPostId}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        })();
        return () => {
            cancelled = true;
        };
    }, [
        initialOpenComments,
        initialPostId,
        loadingPosts,
        onActivateForumSection,
        onOpenComments,
        applyPostsUpdate,
        postsRef,
    ]);

    const visiblePosts = useMemo(
        () =>
            computeVisibleCommunityPosts({
                posts,
                mutedIds,
                currentUserId,
                forumFeedScope,
                followingIds,
                selectedFilterIndex,
                filterLabels: FORUM_FILTER_LABELS,
                urgentPriorityTick,
            }),
        [
            posts,
            mutedIds,
            currentUserId,
            forumFeedScope,
            followingIds,
            selectedFilterIndex,
            urgentPriorityTick,
        ],
    );

    const allTags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags || []))), [posts]);

    return {
        loadingPosts,
        loadingMore,
        hasMore,
        visiblePosts,
        allTags,
        refreshPosts,
        handleLoadMore,
    };
}
