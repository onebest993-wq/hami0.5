import { memo, useRef } from 'react';
import { Pin } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import type { ClusterPinView } from '@/app/workspace/types';
import { HOME_HUB_PIN_ROW_ESTIMATE_PX } from '@/app/services/alerts/homeHubCarouselVirtual';

export type HomeHubPinsVirtualListProps = {
    clusterViews: ClusterPinView[];
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

function HomeHubPinRow({
    view,
    onNavigate,
    onUnpin,
}: {
    view: ClusterPinView;
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
}) {
    const { pin, related } = view;
    const meta = clusterPinDisplayMeta(pin);
    const visual = workspacePinVisual(pin.type);

    return (
        <div
            data-testid={`home-hub-pin-${pin.type}-${pin.id}`}
            className={`flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 ${visual.shell}`}
        >
            <span
                className={`shrink-0 inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1 text-[9px] font-extrabold border ${visual.chip}`}
            >
                {visual.shortLabel}
            </span>
            <button
                type="button"
                onClick={() => onNavigate(pin.routePath)}
                className="flex-1 min-w-0 text-right min-h-[44px] touch-manipulation"
            >
                <p className="text-[11px] font-bold text-white/85 truncate">{meta.headline}</p>
                <p className="text-[9px] text-white/40 truncate">
                    {meta.sectionLabel}
                    {meta.clientLine ? ` · ${meta.clientLine.replace('الموكل: ', '')}` : ''}
                    {related.length > 0 ? ` · ${related.length} ارتباط` : ''}
                </p>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(pin.id, pin.type);
                }}
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center border shrink-0 touch-manipulation ${visual.button} ${visual.accent}`}
                title="إلغاء التثبيت"
                aria-label="إلغاء التثبيت"
            >
                <Pin size={11} className="fill-current" />
            </button>
        </div>
    );
}

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
