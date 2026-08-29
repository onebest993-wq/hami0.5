import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import './../homeHubPinsFx.css';
import { HomeHubEmptyState } from '@/app/components/lawyer/dashboard/HomeHubEmptyState';
import { HOME_HUB_FULLY_EMPTY_COPY } from '@/app/services/alerts/homeHubCardLogic';
import type { ClusterPinView } from '@/app/workspace/types';
import type { ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubPinsVirtual';
import { useClusterAggregatorGated } from '../hooks/useClusterAggregatorGated';
import { splitHomeHubPins } from '../homeHub/homeHubPinsOverflow';
import { HomeHubPinRow } from './HomeHubPinRow';
import { HomeHubTabMoreTrigger } from './HomeHubTabMoreTrigger';
import { HomeHubOverlayChunkFallback } from './HomeHubOverlayChunkFallback';

const LazyHomeHubPinsMoreOverlay = lazy(() =>
    import('./HomeHubPinsMoreOverlay').then((m) => ({ default: m.HomeHubPinsMoreOverlay })),
);

function prefetchHomeHubPinsOverlay(): void {
    void import('./HomeHubPinsMoreOverlay');
}

type HomeHubPinsPanelProps = {
    enabled: boolean;
    aggregatorInput: ClusterAggregatorInput;
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
    hubFullyEmpty?: boolean;
};

export function HomeHubPinsPanel({
    enabled,
    aggregatorInput,
    onNavigate,
    onUnpin,
    hubFullyEmpty = false,
}: HomeHubPinsPanelProps) {
    const clusterViews = useClusterAggregatorGated(enabled, aggregatorInput);
    const [moreOverlayOpen, setMoreOverlayOpen] = useState(false);
    const hasPins = clusterViews.length > 0;

    const { preview, overflowCount, hasOverflow } = useMemo(
        () => splitHomeHubPins(clusterViews),
        [clusterViews],
    );

    useEffect(() => {
        if (!hasOverflow) setMoreOverlayOpen(false);
    }, [hasOverflow]);

    useEffect(() => {
        if (!shouldVirtualizeHomeHubPins(clusterViews.length)) return;
        void import('./HomeHubPinsVirtualList').catch(() => undefined);
    }, [clusterViews.length]);

    useEffect(() => {
        if (!hasOverflow) return;
        prefetchHomeHubPinsOverlay();
    }, [hasOverflow]);

    return (
        <div
            id="home-hub-panel-pins"
            role="tabpanel"
            aria-labelledby="home-hub-tab-pins"
            data-testid="home-hub-panel-pins"
            data-pin-count={clusterViews.length}
            className="hami-hub-pins-panel"
        >
            {hasPins ? (
                <div
                    className={`hami-hub-pins-feed${hasOverflow ? ' hami-hub-pins-feed--has-more' : ''}`}
                    data-testid="home-hub-pins-list"
                >
                    <ul
                        className={`hami-hub-pins-stack space-y-1${hasOverflow ? ' hami-hub-pins-stack--preview' : ''}`}
                        data-testid={hasOverflow ? 'home-hub-pins-preview' : 'home-hub-pins-stack'}
                    >
                        {preview.map((view) => (
                            <li
                                key={`${view.pin.type}:${view.pin.id}`}
                                className="[content-visibility:auto] [contain-intrinsic-size:auto_52px]"
                            >
                                <HomeHubPinRow view={view} onNavigate={onNavigate} onUnpin={onUnpin} />
                            </li>
                        ))}
                    </ul>
                    {hasOverflow ? (
                        <div className="hami-hub-pins-more-dock">
                            <HomeHubTabMoreTrigger
                                layout="dock"
                                count={overflowCount}
                                onClick={() => setMoreOverlayOpen(true)}
                                onPrefetch={prefetchHomeHubPinsOverlay}
                                expanded={moreOverlayOpen}
                                controlsId="home-hub-pins-more-panel"
                                ariaLabel={`عرض كل العناصر المثبّتة — ${clusterViews.length} عنصر`}
                                testId="home-hub-pins-more-trigger"
                            />
                        </div>
                    ) : null}
                    {moreOverlayOpen ? (
                        <Suspense
                            fallback={
                                <HomeHubOverlayChunkFallback
                                    testId="home-hub-pins-more-loading"
                                    label="جاري تحميل قائمة التثبيت"
                                />
                            }
                        >
                            <LazyHomeHubPinsMoreOverlay
                                open={moreOverlayOpen}
                                clusterViews={clusterViews}
                                onClose={() => setMoreOverlayOpen(false)}
                                onNavigate={onNavigate}
                                onUnpin={onUnpin}
                            />
                        </Suspense>
                    ) : null}
                </div>
            ) : hubFullyEmpty ? (
                <HomeHubEmptyState
                    message={HOME_HUB_FULLY_EMPTY_COPY}
                    testId="home-hub-pins-empty"
                    compact
                />
            ) : (
                <p
                    className="text-[10px] text-white/35 leading-relaxed py-2"
                    data-testid="home-hub-pins-empty"
                    role="status"
                >
                    لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.
                </p>
            )}
        </div>
    );
}
