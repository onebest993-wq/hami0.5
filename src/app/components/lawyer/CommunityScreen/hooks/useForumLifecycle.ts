import { useEffect, useRef } from 'react';
import {
    markForumPerfPhase,
    reportForumPerf,
} from '@/app/services/forum/forumPerfMetrics';
import { peekForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';

export function useForumLifecycle(
    userId: string | null,
    loadingPosts: boolean,
    visiblePostCount: number,
) {
    const hadLocalCacheRef = useRef(false);

    useEffect(() => {
        const cached = peekForumPostsCache();
        if (cached && cached.length > 0) {
            hadLocalCacheRef.current = true;
            return;
        }

        let cancelled = false;
        void Promise.all([
            import('@/app/services/lawyer-cloud'),
            import('@/app/services/cloud/lawyerCommunityCloud'),
        ])
            .then(([{ CommunityDB }, { sortCommunityPosts }]) =>
                CommunityDB.listPosts().then((rows) => {
                    if (cancelled) return;
                    const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
                    hadLocalCacheRef.current = local.length > 0;
                }),
            )
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, []);

    const isShellReady = !loadingPosts || visiblePostCount > 0 || hadLocalCacheRef.current;

    useEffect(() => {
        if (!isShellReady) return;
        markForumPerfPhase('first-paint');
        markForumPerfPhase('interactive');
        reportForumPerf({
            userId: userId ?? undefined,
            postCount: visiblePostCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [isShellReady, userId, visiblePostCount]);

    return { isShellReady, hadLocalCache: hadLocalCacheRef.current };
}
