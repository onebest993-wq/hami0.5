import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { isLitePerformanceActiveFromDom } from '@/app/runtime/devicePerformanceTier';

const DEFAULT_INITIAL_WINDOW = 24;
const LITE_INITIAL_WINDOW = 10;
const WINDOW_STEP = 16;
const LITE_WINDOW_STEP = 8;

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
    const [renderCount, setRenderCount] = useState(resolvedInitial);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setRenderCount(Math.min(resolvedInitial, posts.length || resolvedInitial));
    }, [posts.length, resolvedInitial]);

    const windowedPosts = useMemo(
        () => posts.slice(0, Math.min(renderCount, posts.length)),
        [posts, renderCount],
    );

    const expandWindow = useCallback(() => {
        setRenderCount((prev) => Math.min(posts.length, prev + step));
    }, [posts.length, step]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || windowedPosts.length >= posts.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    expandWindow();
                }
            },
            { rootMargin: lite ? '120px 0px' : '240px 0px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [expandWindow, lite, posts.length, windowedPosts.length]);

    return {
        windowedPosts,
        sentinelRef,
        hiddenCount: Math.max(0, posts.length - windowedPosts.length),
    };
}
