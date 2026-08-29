import { useEffect, useRef, useState } from 'react';

/** عدّاد نافذة متنامية عبر sentinel — بلا تكرار IntersectionObserver في كل قائمة */
export function useExpandingVisibleCount(
    total: number,
    options: {
        initial: number;
        step: number;
        resetKey: string;
        rootMargin?: string;
        resetWhenTotalChanges?: boolean;
    },
) {
    const {
        initial,
        step,
        resetKey,
        rootMargin = '200px 0px',
        resetWhenTotalChanges = true,
    } = options;
    const [visibleCount, setVisibleCount] = useState(initial);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (resetWhenTotalChanges) return;
        setVisibleCount(initial);
    }, [initial, resetKey, resetWhenTotalChanges]);

    useEffect(() => {
        if (!resetWhenTotalChanges) return;
        setVisibleCount(total <= 0 ? initial : Math.min(initial, total));
    }, [initial, resetKey, total, resetWhenTotalChanges]);

    const hasMore = visibleCount < total;

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || !hasMore || typeof IntersectionObserver === 'undefined') return undefined;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisibleCount((count) => Math.min(total, count + step));
                }
            },
            { rootMargin },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore, step, total, visibleCount, rootMargin]);

    return { visibleCount, sentinelRef, hasMore };
}
