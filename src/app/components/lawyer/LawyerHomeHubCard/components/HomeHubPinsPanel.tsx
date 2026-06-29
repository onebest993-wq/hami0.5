import { lazy, Suspense } from 'react';
import { Pin } from 'lucide-react';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import type { ClusterPinView } from '@/app/workspace/types';
import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubCarouselVirtual';
import { useHomeHubPanelMount } from '../hooks/useHomeHubPanelMount';

const HomeHubPinsVirtualList = lazy(() =>
    import('./HomeHubPinsVirtualList').then((m) => ({ default: m.HomeHubPinsVirtualList })),
);

export type HomeHubPinsPanelProps = {
    hubPanel: HomeHubPanel;
    clusterViews: ClusterPinView[];
    onNavigate: (routePath: string) => void;
    onUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

function HomeHubPinsStaticList({
    clusterViews,
    onNavigate,
    onUnpin,
}: Pick<HomeHubPinsPanelProps, 'clusterViews' | 'onNavigate' | 'onUnpin'>) {
    return (
        <ul className="space-y-1">
            {clusterViews.map(({ pin, related }) => {
                const meta = clusterPinDisplayMeta(pin);
                const visual = workspacePinVisual(pin.type);
                return (
                    <li
                        key={`${pin.type}:${pin.id}`}
                        className="[content-visibility:auto] [contain-intrinsic-size:auto_52px]"
                    >
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
                    </li>
                );
            })}
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
            hidden={!pinsActive}
            data-testid="home-hub-panel-pins"
            className="flex flex-col min-h-0 flex-1"
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
