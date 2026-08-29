import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';
import { ForumApiService } from '@/app/services/forumApiService';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { peekForumPostsCache, readForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { withForumAsyncTimeout } from '../forumAsync';
import { mergeSortedCommunityPosts } from './communityPostFeedUtils';
import type { CommunitySection } from '../communitySectionState';

const LOCAL_HYDRATE_TIMEOUT_MS = 3_000;
const CACHE_HYDRATE_TIMEOUT_MS = 2_000;
const REMOTE_FETCH_TIMEOUT_MS = 8_000;

export function useCommunityPostsFeedBootstrap({
    activeSection,
    initialPostId,
    pageSize,
    postsRef,
    applyPostsUpdate,
    setLoadingPosts,
    setHasMore,
    postsBootstrappedRef,
    surfaceOpen = true,
}: {
    activeSection: CommunitySection;
    initialPostId?: string | null;
    pageSize: number;
    postsRef: MutableRefObject<CommunityPost[]>;
    applyPostsUpdate: (updater: (prev: CommunityPost[]) => CommunityPost[]) => void;
    setLoadingPosts: Dispatch<SetStateAction<boolean>>;
    setHasMore: Dispatch<SetStateAction<boolean>>;
    postsBootstrappedRef: MutableRefObject<boolean>;
    /** keepAlive مغلق: لا CommunityDB ولا شبكة */
    surfaceOpen?: boolean;
}) {
    useEffect(() => {
        if (surfaceOpen === false) return;
        if (activeSection !== 'forum' && !initialPostId) return;
        if (postsBootstrappedRef.current) return;
        let cancelled = false;

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
                setLoadingPosts(false);
            } else {
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
                    setLoadingPosts(false);
                }
            }
        };

        void runBootstrap();
        return () => {
            cancelled = true;
        };
    }, [
        applyPostsUpdate,
        pageSize,
        postsRef,
        activeSection,
        initialPostId,
        postsBootstrappedRef,
        setHasMore,
        setLoadingPosts,
        surfaceOpen,
    ]);
}
