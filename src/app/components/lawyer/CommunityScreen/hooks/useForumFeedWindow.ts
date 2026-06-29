import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

const DEFAULT_INITIAL_WINDOW = 24;
const WINDOW_STEP = 16;

/**
 * نافذة عرض تدريجية — تقلّل DOM nodes دون تغيير بصري.
 * يُوسَّع تلقائياً عند الاقتراب من نهاية القائمة المعروضة.
 */
export function useForumFeedWindow(
    posts: CommunityPost[],
    initialWindow = DEFAULT_INITIAL_WINDOW,
) {
    const [renderCount, setRenderCount] = useState(initialWindow);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setRenderCount(Math.min(initialWindow, posts.length || initialWindow));
    }, [posts.length, initialWindow]);

    const windowedPosts = useMemo(
        () => posts.slice(0, Math.min(renderCount, posts.length)),
        [posts, renderCount],
    );

    const expandWindow = useCallback(() => {
        setRenderCount((prev) => Math.min(posts.length, prev + WINDOW_STEP));
    }, [posts.length]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || windowedPosts.length >= posts.length) return undefined;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    expandWindow();
                }
            },
            { rootMargin: '240px 0px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [expandWindow, posts.length, windowedPosts.length]);

    return {
        windowedPosts,
        sentinelRef,
        hiddenCount: Math.max(0, posts.length - windowedPosts.length),
    };
}
