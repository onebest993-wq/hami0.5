import { memo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ClusterPinView } from '@/app/workspace/types';
import { HOME_HUB_PIN_ROW_ESTIMATE_PX } from '@/app/services/alerts/homeHubCarouselVirtual';
import { HomeHubPinRow } from './HomeHubPinRow';

export type HomeHubPinsVirtualListProps = {
    clusterViews: ClusterPinView[];
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

export const HomeHubPinsVirtualList = memo(function HomeHubPinsVirtualList({
    clusterViews,
    onNavigate,
    onUnpin,
}: HomeHubPinsVirtualListProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: clusterViews.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => HOME_HUB_PIN_ROW_ESTIMATE_PX,
        overscan: 3,
        measureElement: (el) => el.getBoundingClientRect().height,
    });

    return (
        <div
            ref={scrollRef}
            className="max-h-[min(42dvh,320px)] overflow-y-auto overscroll-y-contain touch-pan-y [-webkit-overflow-scrolling:touch] scrollbar-hide"
            data-testid="home-hub-pins-virtual-scroll"
        >
            <ul
                className="relative w-full space-y-1"
                style={{ height: `${virtualizer.getTotalSize()}px` }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const view = clusterViews[virtualRow.index];
                    if (!view) return null;
                    return (
                        <li
                            key={`${view.pin.type}:${view.pin.id}`}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            className="absolute top-0 left-0 w-full pb-1"
                            style={{ transform: `translateY(${virtualRow.start}px)` }}
                        >
                            <HomeHubPinRow view={view} onNavigate={onNavigate} onUnpin={onUnpin} />
                        </li>
                    );
                })}
            </ul>
        </div>
    );
});
