import { lazy, Suspense, useEffect } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    HOME_HUB_ALERTS_EMPTY_COPY,
    HOME_HUB_FULLY_EMPTY_COPY,
    type HomeHubAlertsEmptyState,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import { HorizonFilterTabs } from '../../NeuralAlertsCard/HorizonFilterTabs';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { useHomeHubPanelMount } from '../hooks/useHomeHubPanelMount';
import { HomeHubRadarSection } from './HomeHubRadarSection';

const loadHomeHubAlertsCarousel = () =>
    import('./HomeHubAlertsCarousel').then((m) => ({ default: m.HomeHubAlertsCarousel }));

const HomeHubAlertsCarousel = lazy(loadHomeHubAlertsCarousel);

function HomeHubAlertsDeferredFallback() {
    return (
        <div
            className="flex-1 min-h-0 rounded-[1.25rem] border border-white/[0.06] bg-white/[0.03] animate-pulse"
            style={{ minHeight: `calc(112px * var(--hami-content-scale, 1))` }}
            role="status"
            aria-live="polite"
            data-testid="home-hub-alerts-deferred-fallback"
        >
            <span className="sr-only">جار تجهيز التنبيهات</span>
        </div>
    );
}

export type HomeHubAlertsPanelProps = {
    hubPanel: HomeHubPanel;
    hasCarouselAlerts: boolean;
    horizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    onFilterChange: (filter: AlertTimeHorizon) => void;
    alertsEmptyState: HomeHubAlertsEmptyState;
    alertsError: string | null;
    hasAlerts: boolean;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    alertsLayoutKey: string;
    radarEvents: CalendarRadarEvent[];
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    hubFullyEmpty?: boolean;
};

export function HomeHubAlertsPanel({
    hubPanel,
    hasCarouselAlerts,
    horizonCounts,
    activeFilter,
    onFilterChange,
    alertsEmptyState,
    alertsError,
    hasAlerts,
    carouselAlerts,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    onAcceptedConvertToCase,
    onResolved,
    alertsLayoutKey,
    radarEvents,
    onNavigate,
    onDismissRadar,
    hubFullyEmpty = false,
}: HomeHubAlertsPanelProps) {
    const alertsActive = hubPanel === 'alerts';
    const alertsMounted = useHomeHubPanelMount(alertsActive, true);

    useEffect(() => {
        if (!alertsActive && !alertsMounted) return;
        void loadHomeHubAlertsCarousel().catch(() => undefined);
    }, [alertsActive, alertsMounted]);

    return (
        <div
            id="home-hub-panel-alerts"
            role="tabpanel"
            aria-labelledby="home-hub-tab-alerts"
            aria-hidden={!alertsActive}
            aria-busy={alertsActive && alertsEmptyState === 'loading' ? true : undefined}
            data-testid="home-hub-panel-alerts"
            className="flex flex-col min-h-0 flex-1"
            style={{ display: alertsActive ? undefined : 'none' }}
        >
            {alertsMounted && alertsActive && hasCarouselAlerts ? (
                <div className="mb-2" style={{ marginBottom: `calc(0.5rem * var(--hami-content-scale, 1))` }}>
                    <HorizonFilterTabs counts={horizonCounts} activeFilter={activeFilter} onChange={onFilterChange} />
                </div>
            ) : null}

            {alertsMounted ? (
                <div className="flex-1 flex flex-col min-h-0">
                    {!alertsActive ? null : alertsEmptyState === 'error' ? (
                        <p
                            className="text-[10px] text-red-300/90 leading-relaxed flex-1 flex items-center py-6"
                            role="alert"
                        >
                            {alertsError}
                        </p>
                    ) : alertsEmptyState === 'loading' ? (
                        <p className="text-[10px] text-white/35 flex-1 flex items-center py-6" role="status">
                            {HOME_HUB_ALERTS_EMPTY_COPY.loading}
                        </p>
                    ) : alertsEmptyState === 'content' && hasAlerts ? (
                        <Suspense fallback={<HomeHubAlertsDeferredFallback />}>
                            <HomeHubAlertsCarousel
                                carouselAlerts={carouselAlerts}
                                sourceById={sourceById}
                                onDismissAlert={onDismissAlert}
                                onOpenEntity={onOpenEntity}
                                onAcceptedConvertToCase={onAcceptedConvertToCase}
                                onResolved={onResolved}
                                activeFilter={activeFilter}
                                layoutKey={alertsLayoutKey}
                            />
                        </Suspense>
                    ) : alertsEmptyState === 'empty-filter' ? (
                        <p
                            className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6"
                            role="status"
                        >
                            {HOME_HUB_ALERTS_EMPTY_COPY['empty-filter']}
                        </p>
                    ) : alertsEmptyState === 'empty' ? (
                        <p
                            className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6"
                            data-testid={hubFullyEmpty ? 'home-hub-fully-empty' : 'home-hub-alerts-empty'}
                            role="status"
                        >
                            {hubFullyEmpty ? HOME_HUB_FULLY_EMPTY_COPY : HOME_HUB_ALERTS_EMPTY_COPY.empty}
                        </p>
                    ) : null}

                    {alertsActive ? (
                        <HomeHubRadarSection
                            events={radarEvents}
                            showDivider={hasAlerts || hasCarouselAlerts}
                            onNavigate={onNavigate}
                            onDismiss={onDismissRadar}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
