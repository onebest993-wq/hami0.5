import { useMemo } from 'react';
import type { CommunityComment } from '@/app/services/lawyer-cloud';
import { useExpandingVisibleCount } from './useExpandingVisibleCount';

export const COMMENT_INITIAL_WINDOW = 30;
export const COMMENT_WINDOW_STEP = 20;

export function useCommentThreadWindow(
    postId: string,
    sortMode: string,
    topLevelThreads: CommunityComment[],
) {
    const { visibleCount, sentinelRef: commentSentinelRef } = useExpandingVisibleCount(
        topLevelThreads.length,
        {
            initial: COMMENT_INITIAL_WINDOW,
            step: COMMENT_WINDOW_STEP,
            resetKey: `${postId}\0${sortMode}`,
            rootMargin: '240px 0px',
            resetWhenTotalChanges: false,
        },
    );

    const windowedTopThreads = useMemo(
        () => topLevelThreads.slice(0, Math.min(visibleCount, topLevelThreads.length)),
        [topLevelThreads, visibleCount],
    );

    return {
        windowedTopThreads,
        hiddenThreadCount: topLevelThreads.length - windowedTopThreads.length,
        commentSentinelRef,
    };
}
