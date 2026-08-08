import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import type { ClusterPinView } from '@/app/workspace/types';
import { shouldVirtualizeHomeHubPins } from '@/app/services/alerts/homeHubCarouselVirtual';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubPinRow } from './HomeHubPinRow';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';
import '../homeHubCardFx.css';

const HomeHubPinsVirtualList = lazy(() =>
    import('./HomeHubPinsVirtualList').then((m) => ({ default: m.HomeHubPinsVirtualList })),
);

const HUB_CONTENT_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HomeHubPinsMoreOverlayProps = {
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
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, 'home-hub-pins-more');

    if (!open || clusterViews.length === 0) return null;

    const useVirtual = shouldVirtualizeHomeHubPins(clusterViews.length);

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid="home-hub-pins-more-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={`التثبيت — ${clusterViews.length} عنصر`}
            dir="rtl"
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label="إغلاق قائمة التثبيت"
                onClick={requestBack}
            />
            <div
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid="home-hub-pins-more-panel"
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title">التثبيت</p>
                            <p className="hami-hub-radar-overlay__subtitle">
                                كل العناصر · {clusterViews.length} عنصر
                            </p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span className="hami-hub-radar-overlay__count-badge">{clusterViews.length}</span>
                        <button
                            type="button"
                            className={`hami-hub-radar-overlay__close ${HUB_CONTENT_BUTTON_A11Y}`}
                            aria-label="إغلاق"
                            onClick={requestBack}
                        >
                            <X size={18} strokeWidth={2.2} aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="hami-hub-radar-overlay__body hami-hub-radar-overlay__body--scroll">
                    {useVirtual ? (
                        <Suspense fallback={null}>
                            <HomeHubPinsVirtualList
                                clusterViews={clusterViews}
                                onNavigate={onNavigate}
                                onUnpin={onUnpin}
                            />
                        </Suspense>
                    ) : (
                        <ul className="hami-hub-pins-stack hami-hub-pins-stack--overlay space-y-1">
                            {clusterViews.map((view) => (
                                <li key={`${view.pin.type}:${view.pin.id}`}>
                                    <HomeHubPinRow
                                        view={view}
                                        onNavigate={onNavigate}
                                        onUnpin={onUnpin}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );

    return typeof document !== 'undefined' ? createPortal(layer, document.body) : null;
}
