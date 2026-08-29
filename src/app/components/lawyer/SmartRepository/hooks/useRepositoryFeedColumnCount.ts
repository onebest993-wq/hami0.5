import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { RepositoryFeedLayoutId } from '../repositoryFeedLayout';
import { resolveRepositoryFeedColumnCount } from '../repositoryFeedVirtualLayout';

export function useRepositoryFeedColumnCount(
    containerRef: RefObject<HTMLElement | null>,
    layoutId: RepositoryFeedLayoutId,
): number {
    const [columnCount, setColumnCount] = useState(() =>
        resolveRepositoryFeedColumnCount(layoutId, typeof window !== 'undefined' ? window.innerWidth : 640),
    );

    useEffect(() => {
        const node = containerRef.current;
        if (!node || typeof ResizeObserver === 'undefined') return undefined;

        let raf = 0;
        const sync = () => {
            const width = node.clientWidth || window.innerWidth;
            const next = resolveRepositoryFeedColumnCount(layoutId, width);
            setColumnCount((prev) => (prev === next ? prev : next));
        };
        const schedule = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                sync();
            });
        };

        sync();
        const observer = new ResizeObserver(schedule);
        observer.observe(node);
        return () => {
            if (raf) cancelAnimationFrame(raf);
            observer.disconnect();
        };
    }, [containerRef, layoutId]);

    return columnCount;
}
