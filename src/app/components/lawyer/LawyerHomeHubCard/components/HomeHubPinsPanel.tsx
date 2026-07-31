import { lazy, Suspense } from 'react';
import { Pin } from 'lucide-react';
import type { ClusterPinView } from '@/app/workspace/types';
import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubCarouselVirtual';
import { useHomeHubPanelMount } from '../hooks/useHomeHubPanelMount';
import { HomeHubPinRow } from './HomeHubPinRow';

const HomeHubPinsVirtualList = lazy(() =>
    import('./HomeHubPinsVirtualList').then((m) => ({ default: m.HomeHubPinsVirtualList })),
);

export type HomeHubPinsPanelProps = {
    hubPanel: HomeHubPanel;
    clusterViews: ClusterPinView[];
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
    hubFullyEmpty?: boolean;
};

function HomeHubPinsStaticList({
    clusterViews,
    onNavigate,
    onUnpin,
}: Pick<HomeHubPinsPanelProps, 'clusterViews' | 'onNavigate' | 'onUnpin'>) {
    return (
        <ul className="space-y-1">
            {clusterViews.map((view) => (
                <li
                    key={`${view.pin.type}:${view.pin.id}`}
                    className="[content-visibility:auto] [contain-intrinsic-size:auto_52px]"
                >
                    <HomeHubPinRow view={view} onNavigate={onNavigate} onUnpin={onUnpin} />
                </li>
            ))}
        </ul>
    );
}

export function HomeHubPinsPanel({ hubPanel, clusterViews, onNavigate, onUnpin }: HomeHubPinsPanelProps) {
    const pinsActive = hubPanel === 'pins';
    const pinsMounted = useHomeHubPanelMount(pinsActive);
    const hasPins = clusterViews.length > 0;
    const useVirtual = shouldVirtualizeHomeHubPins(clusterViews.length);

    return (
        <div
            id="home-hub-panel-pins"
            role="tabpanel"
            aria-labelledby="home-hub-tab-pins"
            aria-hidden={!pinsActive}
            data-testid="home-hub-panel-pins"
            className="flex flex-col min-h-0 flex-1"
            style={{ display: pinsActive ? undefined : 'none' }}
        >
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0"
                    style={{
                        width: `calc(2rem * var(--hami-content-scale, 1))`,
                        height: `calc(2rem * var(--hami-content-scale, 1))`,
                    }}
                >
                    <Pin
                        className="hami-home-accent-text opacity-90"
                        aria-hidden
                        style={{
                            width: `calc(14px * var(--hami-content-scale, 1))`,
                            height: `calc(14px * var(--hami-content-scale, 1))`,
                        }}
                    />
                </div>
                <h2
                    className="text-[#F5F0E6] font-bold leading-none"
                    style={{ fontSize: `calc(13px * var(--hami-content-scale, 1))` }}
                >
                    التثبيت السريع
                </h2>
                <span
                    className="font-bold text-[#E6C673]/70 tabular-nums mr-auto"
                    style={{ fontSize: `calc(9px * var(--hami-content-scale, 1))` }}
                >
                    {clusterViews.length}
                </span>
            </div>

            {!pinsMounted ? null : hasPins ? (
                useVirtual ? (
                    <Suspense fallback={null}>
                        <HomeHubPinsVirtualList
                            clusterViews={clusterViews}
                            onNavigate={onNavigate}
                            onUnpin={onUnpin}
                        />
                    </Suspense>
                ) : (
                    <HomeHubPinsStaticList
                        clusterViews={clusterViews}
                        onNavigate={onNavigate}
                        onUnpin={onUnpin}
                    />
                )
            ) : (
                <p className="text-[10px] text-white/35 leading-relaxed py-6" data-testid="home-hub-pins-empty">
                    لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.
                </p>
            )}
        </div>
    );
}
