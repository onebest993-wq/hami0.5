import { useMemo } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';
import { useExpandingVisibleCount } from './useExpandingVisibleCount';

const DEFAULT_INITIAL_WINDOW = 16;
const LITE_INITIAL_WINDOW = 8;
const WINDOW_STEP = 12;
const LITE_WINDOW_STEP = 6;

/**
 * نافذة عرض تدريجية — تقلّل DOM nodes دون تغيير بصري.
 * على الأجهزة المتواضعة تبدأ أصغر وتتوسّع بخطوات أقل.
 */
export function useForumFeedWindow(
    posts: CommunityPost[],
    initialWindow?: number,
) {
    const lite = isLitePerformanceActiveFromDom() === true;
    const resolvedInitial = initialWindow ?? (lite ? LITE_INITIAL_WINDOW : DEFAULT_INITIAL_WINDOW);
    const step = lite ? LITE_WINDOW_STEP : WINDOW_STEP;
    const { visibleCount, sentinelRef } = useExpandingVisibleCount(posts.length, {
        initial: resolvedInitial,
        step,
        resetKey: String(resolvedInitial),
        rootMargin: lite ? '120px 0px' : '240px 0px',
    });

    const windowedPosts = useMemo(
        () => posts.slice(0, Math.min(visibleCount, posts.length)),
        [posts, visibleCount],
    );

    return {
        windowedPosts,
        sentinelRef,
        hiddenCount: Math.max(0, posts.length - windowedPosts.length),
    };
}
