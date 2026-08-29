import { useEffect, useRef } from 'react';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import {
    markForumPerfPhase,
    reportForumPerf,
} from '@/app/services/forum/forumPerfMetrics';
import { peekForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';

export function useForumLifecycle(
    userId: string | null,
    loadingPosts: boolean,
    visiblePostCount: number,
    isOpen = true,
) {
    const hadLocalCacheRef = useRef(false);

    useEffect(() => {
        if (!isOpen) return;
        const cached = peekForumPostsCache();
        if (cached && cached.length > 0) {
            hadLocalCacheRef.current = true;
            return;
        }

        let cancelled = false;
        void CommunityDB.listPosts()
            .then((rows) => {
                if (cancelled) return;
                const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
                hadLocalCacheRef.current = local.length > 0;
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const isShellReady = !loadingPosts || visiblePostCount > 0 || hadLocalCacheRef.current;
    const markedThisOpenRef = useRef(false);

    useEffect(() => {
        if (!isOpen) {
            markedThisOpenRef.current = false;
            return;
        }
        // الشريط يظهر قبل انتهاء تغذية المنشورات — التفاعل = السطح مفتوح وليس انتظار الشبكة
        if (markedThisOpenRef.current) return;
        markedThisOpenRef.current = true;
        markForumPerfPhase('first-paint');
        markForumPerfPhase('interactive');
        reportForumPerf({
            userId: userId ?? undefined,
            postCount: visiblePostCount,
            hadLocalCache: hadLocalCacheRef.current,
        });
    }, [isOpen, userId, visiblePostCount]);

    return { isShellReady, hadLocalCache: hadLocalCacheRef.current };
}
