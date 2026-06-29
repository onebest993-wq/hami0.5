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

        const sync = () => {
            const width = node.clientWidth || window.innerWidth;
            setColumnCount(resolveRepositoryFeedColumnCount(layoutId, width));
        };

        sync();
        const observer = new ResizeObserver(sync);
        observer.observe(node);
        window.addEventListener('resize', sync);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', sync);
        };
    }, [containerRef, layoutId]);

    return columnCount;
}
