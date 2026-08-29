import { lazy, Suspense, useMemo } from 'react';
import { HomeHubEmptyState } from '@/app/components/lawyer/dashboard/HomeHubEmptyState';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { HOME_HUB_ALERTS_EMPTY_COPY } from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent, WorkspacePinnedItem } from '@/app/workspace/types';
import {
    HorizonFilterTabs,
    HOME_HUB_ALERT_HORIZONS,
} from '../../NeuralAlertsCard/HorizonFilterTabs';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import {
    splitHomeHubUrgentOverflow,
    splitHomeHubUpcomingOverflow,
} from '../homeHub/homeHubTabOverflow';
import { useHomeHubAlertsOverflowOverlays } from '../hooks/useHomeHubAlertsOverflowOverlays';
import { HomeHubAlertsList } from './HomeHubAlertsList';
import { HomeHubTabMoreTrigger } from './HomeHubTabMoreTrigger';
import { HomeHubUrgentTabContent } from './HomeHubUrgentTabContent';
import { HomeHubOverlayChunkFallback } from './HomeHubOverlayChunkFallback';

const LazyHomeHubUrgentMoreOverlay = lazy(() =>
    import('./HomeHubUrgentMoreOverlay').then((m) => ({ default: m.HomeHubUrgentMoreOverlay })),
);
const LazyHomeHubAlertsMoreOverlay = lazy(() =>
    import('./HomeHubAlertsMoreOverlay').then((m) => ({ default: m.HomeHubAlertsMoreOverlay })),
);

function prefetchHomeHubUrgentOverlay(): void {
    void import('./HomeHubUrgentMoreOverlay');
}

function prefetchHomeHubUpcomingOverlay(): void {
    void import('./HomeHubAlertsMoreOverlay');
}

type HomeHubAlertsPrimaryBodyProps = {
    horizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    onFilterChange: (filter: AlertTimeHorizon) => void;
    hasAlerts: boolean;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    radarEvents: CalendarRadarEvent[];
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

export function HomeHubAlertsPrimaryBody({
    horizonCounts,
    activeFilter,
    onFilterChange,
    hasAlerts,
    carouselAlerts,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    radarEvents,
    onNavigate,
    onDismissRadar,
    onTogglePin,
    isPinned,
}: HomeHubAlertsPrimaryBodyProps) {
    const hasRadar = radarEvents.length > 0;
    const isUrgentTab = activeFilter === 'urgent';
    const tabHasListedItems = isUrgentTab ? hasRadar || hasAlerts : hasAlerts;

    const urgentSplit = useMemo(
        () => splitHomeHubUrgentOverflow(radarEvents, carouselAlerts),
        [radarEvents, carouselAlerts],
    );
    const upcomingSplit = useMemo(() => splitHomeHubUpcomingOverflow(carouselAlerts), [carouselAlerts]);
    const {
        urgentOverlayOpen,
        upcomingOverlayOpen,
        overflowCount,
        expanded,
        openOverflow,
        closeUrgent,
        closeUpcoming,
        prefetchActive,
    } = useHomeHubAlertsOverflowOverlays({
        isUrgentTab,
        urgentOverflowCount: urgentSplit.overflowCount,
        upcomingOverflowCount: upcomingSplit.overflowCount,
        prefetchUrgent: prefetchHomeHubUrgentOverlay,
        prefetchUpcoming: prefetchHomeHubUpcomingOverlay,
    });

    return (
        <>
            <div className="hami-hub-horizon-row">
                <HorizonFilterTabs
                    counts={horizonCounts}
                    activeFilter={activeFilter}
                    onChange={onFilterChange}
                    horizons={HOME_HUB_ALERT_HORIZONS}
                    compact
                    feedId="home-hub-alerts-feed"
                    idPrefix="home-hub-horizon"
                />
                <HomeHubTabMoreTrigger
                    count={overflowCount}
                    onClick={openOverflow}
                    onPrefetch={prefetchActive}
                    expanded={expanded}
                    controlsId={
                        isUrgentTab ? 'home-hub-urgent-more-panel' : 'home-hub-alerts-more-panel'
                    }
                    ariaLabel={
                        isUrgentTab
                            ? `عرض ${overflowCount} تنبيهات عاجلة إضافية`
                            : `عرض ${overflowCount} مواعيد قادمة إضافية`
                    }
                    testId={
                        isUrgentTab ? 'home-hub-urgent-more-trigger' : 'home-hub-alerts-more-trigger'
                    }
                />
            </div>

            <div
                className="hami-hub-alerts-feed"
                id="home-hub-alerts-feed"
                role="tabpanel"
                aria-labelledby={`home-hub-horizon-${activeFilter}`}
                data-testid="home-hub-alerts-feed"
            >
                {tabHasListedItems ? (
                    isUrgentTab ? (
                        <HomeHubUrgentTabContent
                            split={urgentSplit}
                            sourceById={sourceById}
                            onDismissAlert={onDismissAlert}
                            onOpenEntity={onOpenEntity}
                            onNavigate={onNavigate}
                            onDismissRadar={onDismissRadar}
                            onTogglePin={onTogglePin}
                            isPinned={isPinned}
                        />
                    ) : (
                        <HomeHubAlertsList
                            split={upcomingSplit}
                            sourceById={sourceById}
                            onDismissAlert={onDismissAlert}
                            onOpenEntity={onOpenEntity}
                            onTogglePin={onTogglePin}
                            isPinned={isPinned}
                        />
                    )
                ) : (
                    <HomeHubEmptyState
                        message={HOME_HUB_ALERTS_EMPTY_COPY['empty-filter']}
                        compact
                    />
                )}
            </div>

            {urgentOverlayOpen ? (
                <Suspense
                    fallback={
                        <HomeHubOverlayChunkFallback
                            testId="home-hub-urgent-more-loading"
                            label="جاري تحميل قائمة العاجل"
                        />
                    }
                >
                    <LazyHomeHubUrgentMoreOverlay
                        open={urgentOverlayOpen}
                        radarEvents={urgentSplit.overflowRadar}
                        carouselAlerts={urgentSplit.overflowAlerts}
                        sourceById={sourceById}
                        onClose={closeUrgent}
                        onNavigate={onNavigate}
                        onDismissRadar={onDismissRadar}
                        onDismissAlert={onDismissAlert}
                        onOpenEntity={onOpenEntity}
                        onTogglePin={onTogglePin}
                        isPinned={isPinned}
                    />
                </Suspense>
            ) : null}
            {upcomingOverlayOpen ? (
                <Suspense
                    fallback={
                        <HomeHubOverlayChunkFallback
                            testId="home-hub-alerts-more-loading"
                            label="جاري تحميل قائمة القادم"
                        />
                    }
                >
                    <LazyHomeHubAlertsMoreOverlay
                        open={upcomingOverlayOpen}
                        carouselAlerts={upcomingSplit.overflowAlerts}
                        sourceById={sourceById}
                        onClose={closeUpcoming}
                        onDismissAlert={onDismissAlert}
                        onOpenEntity={onOpenEntity}
                        onTogglePin={onTogglePin}
                        isPinned={isPinned}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
