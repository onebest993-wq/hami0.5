import { useEffect, useMemo, useState } from 'react';
import type { ClusterPinView } from '@/app/workspace/types';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubCarouselVirtual';
import { splitHomeHubPins } from '../homeHub/homeHubPinsOverflow';
import { HomeHubPinRow } from './HomeHubPinRow';
import { HomeHubPinsMoreOverlay } from './HomeHubPinsMoreOverlay';
import { HomeHubTabMoreTrigger } from './HomeHubTabMoreTrigger';

export type HomeHubPinsPanelProps = {
    clusterViews: ClusterPinView[];
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
    hubFullyEmpty?: boolean;
};

export function HomeHubPinsPanel({
    clusterViews,
    onNavigate,
    onUnpin,
}: HomeHubPinsPanelProps) {
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
                                ariaLabel={`عرض كل العناصر المثبّتة — ${clusterViews.length} عنصر`}
                                testId="home-hub-pins-more-trigger"
                            />
                        </div>
                    ) : null}
                    <HomeHubPinsMoreOverlay
                        open={moreOverlayOpen}
                        clusterViews={clusterViews}
                        onClose={() => setMoreOverlayOpen(false)}
                        onNavigate={onNavigate}
                        onUnpin={onUnpin}
                    />
                </div>
            ) : (
                <p
                    className="text-[10px] text-white/35 leading-relaxed py-2"
                    data-testid="home-hub-pins-empty"
                >
                    لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.
                </p>
            )}
        </div>
    );
}
