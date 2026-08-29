import { lazy, Suspense } from 'react';
import type { ClusterPinView } from '@/app/workspace/types';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubPinsVirtual';
import { HomeHubMoreOverlayShell } from './HomeHubMoreOverlayShell';
import { HomeHubOverlayChunkFallback } from './HomeHubOverlayChunkFallback';
import { HomeHubPinRow } from './HomeHubPinRow';

const HomeHubPinsVirtualList = lazy(() =>
    import('./HomeHubPinsVirtualList').then((m) => ({ default: m.HomeHubPinsVirtualList })),
);

type HomeHubPinsMoreOverlayProps = {
    open: boolean;
    clusterViews: ClusterPinView[];
    onClose: () => void;
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

export function HomeHubPinsMoreOverlay({
    open,
    clusterViews,
    onClose,
    onNavigate,
    onUnpin,
}: HomeHubPinsMoreOverlayProps) {
    const useVirtual = shouldVirtualizeHomeHubPins(clusterViews.length);

    const handleNavigate = (routePath: string) => {
        onNavigate(routePath);
        onClose();
    };

    return (
        <HomeHubMoreOverlayShell
            open={open && clusterViews.length > 0}
            overlayId="home-hub-pins-more"
            onClose={onClose}
            testId="home-hub-pins-more-overlay"
            panelTestId="home-hub-pins-more-panel"
            ariaLabel={`التثبيت — ${clusterViews.length} عنصر`}
            backdropAriaLabel="إغلاق قائمة التثبيت"
            title="التثبيت"
            subtitle={`كل العناصر · ${clusterViews.length} عنصر`}
            count={clusterViews.length}
            bodyClassName="hami-hub-radar-overlay__body--scroll"
        >
            {useVirtual ? (
                <Suspense
                    fallback={
                        <HomeHubOverlayChunkFallback
                            testId="home-hub-pins-virtual-loading"
                            label="جاري تحميل قائمة التثبيت"
                        />
                    }
                >
                    <HomeHubPinsVirtualList
                        clusterViews={clusterViews}
                        onNavigate={handleNavigate}
                        onUnpin={onUnpin}
                    />
                </Suspense>
            ) : (
                <ul className="hami-hub-pins-stack hami-hub-pins-stack--overlay space-y-1">
                    {clusterViews.map((view) => (
                        <li key={`${view.pin.type}:${view.pin.id}`}>
                            <HomeHubPinRow
                                view={view}
                                onNavigate={handleNavigate}
                                onUnpin={onUnpin}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </HomeHubMoreOverlayShell>
    );
}
