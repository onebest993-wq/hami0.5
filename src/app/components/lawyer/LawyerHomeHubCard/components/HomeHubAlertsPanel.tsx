import { lazy, Suspense } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    HOME_HUB_ALERTS_EMPTY_COPY,
    type HomeHubAlertsEmptyState,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import { HorizonFilterTabs } from '../../NeuralAlertsCard/HorizonFilterTabs';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { useHomeHubPanelMount } from '../hooks/useHomeHubPanelMount';
import { HomeHubRadarSection } from './HomeHubRadarSection';

const HomeHubAlertsCarousel = lazy(() =>
    import('./HomeHubAlertsCarousel').then((m) => ({ default: m.HomeHubAlertsCarousel })),
);

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
}: HomeHubAlertsPanelProps) {
    const alertsActive = hubPanel === 'alerts';
    const alertsMounted = useHomeHubPanelMount(alertsActive);

    return (
        <div
            id="home-hub-panel-alerts"
            role="tabpanel"
            aria-labelledby="home-hub-tab-alerts"
            hidden={!alertsActive}
            data-testid="home-hub-panel-alerts"
            className="flex flex-col min-h-0 flex-1"
        >
            {alertsMounted && alertsActive && hasCarouselAlerts ? (
                <div className="mb-2" style={{ marginBottom: `calc(0.5rem * var(--hami-content-scale, 1))` }}>
                    <HorizonFilterTabs counts={horizonCounts} activeFilter={activeFilter} onChange={onFilterChange} />
                </div>
            ) : null}

            {alertsMounted ? (
                <div className="flex-1 flex flex-col min-h-0">
                    {!alertsActive ? null : alertsEmptyState === 'error' ? (
                        <p className="text-[10px] text-red-300/90 leading-relaxed flex-1 flex items-center py-6">
                            {alertsError}
                        </p>
                    ) : alertsEmptyState === 'loading' ? (
                        <p className="text-[10px] text-white/35 flex-1 flex items-center py-6">
                            {HOME_HUB_ALERTS_EMPTY_COPY.loading}
                        </p>
                    ) : alertsEmptyState === 'content' && hasAlerts ? (
                        <Suspense fallback={null}>
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
                        <p className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6">
                            {HOME_HUB_ALERTS_EMPTY_COPY['empty-filter']}
                        </p>
                    ) : alertsEmptyState === 'empty' ? (
                        <p
                            className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6"
                            data-testid="home-hub-alerts-empty"
                        >
                            {HOME_HUB_ALERTS_EMPTY_COPY.empty}
                        </p>
                    ) : null}

                    {alertsActive ? (
                        <HomeHubRadarSection
                            events={radarEvents}
                            showDivider={hasAlerts || hasCarouselAlerts}
                            onNavigate={onNavigate}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
