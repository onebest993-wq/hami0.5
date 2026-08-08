import { useMemo, useState } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    HOME_HUB_ALERTS_EMPTY_COPY,
    HOME_HUB_FULLY_EMPTY_COPY,
    type HomeHubAlertsEmptyState,
} from '@/app/services/alerts/homeHubCardLogic';
import {
    HorizonFilterTabs,
    HOME_HUB_ALERT_HORIZONS,
} from '../../NeuralAlertsCard/HorizonFilterTabs';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import {
    splitHomeHubUrgentOverflow,
    splitHomeHubUpcomingOverflow,
} from '../homeHub/homeHubTabOverflow';
import { HomeHubAlertsLoadingSkeleton } from './HomeHubAlertsLoadingSkeleton';
import { HomeHubEmptyState } from './HomeHubRadarSection';
import { HomeHubAlertsList } from './HomeHubAlertsList';
import { HomeHubAlertsMoreOverlay } from './HomeHubAlertsMoreOverlay';
import { HomeHubTabMoreTrigger } from './HomeHubTabMoreTrigger';
import { HomeHubUrgentMoreOverlay } from './HomeHubUrgentMoreOverlay';
import { HomeHubUrgentTabContent } from './HomeHubUrgentTabContent';

export type HomeHubAlertsPanelProps = {
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
    hubInitialPending?: boolean;
};

export function HomeHubAlertsPanel({
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
    radarEvents,
    onNavigate,
    onDismissRadar,
    hubFullyEmpty = false,
    hubInitialPending = false,
}: HomeHubAlertsPanelProps) {
    const keyboardInset = useMobileKeyboardInset(true);
    const [urgentOverlayOpen, setUrgentOverlayOpen] = useState(false);
    const [upcomingOverlayOpen, setUpcomingOverlayOpen] = useState(false);

    const hasRadar = radarEvents.length > 0;
    const isUrgentTab = activeFilter === 'urgent';
    const tabHasListedItems = isUrgentTab ? hasRadar || hasAlerts : hasAlerts;

    const urgentSplit = useMemo(
        () => splitHomeHubUrgentOverflow(radarEvents, carouselAlerts),
        [radarEvents, carouselAlerts],
    );
    const upcomingSplit = useMemo(() => splitHomeHubUpcomingOverflow(carouselAlerts), [carouselAlerts]);

    const overflowCount = isUrgentTab ? urgentSplit.overflowCount : upcomingSplit.overflowCount;

    const hasAnyHorizonContent = horizonCounts.urgent > 0 || horizonCounts.upcoming > 0;

    const showLoadingSkeleton =
        hubInitialPending || (alertsEmptyState === 'loading' && !hasCarouselAlerts && !hasRadar);

    const showPrimaryAlerts = alertsEmptyState !== 'error' && !showLoadingSkeleton;

    return (
        <div
            id="home-hub-panel-alerts"
            role="tabpanel"
            aria-labelledby="home-hub-tab-alerts"
            aria-busy={alertsEmptyState === 'loading' ? true : undefined}
            data-testid="home-hub-panel-alerts"
            className="hami-hub-alerts-panel"
        >
            <div className="hami-hub-alerts-stack">
                {alertsEmptyState === 'error' ? (
                    <p className="text-[10px] text-red-300/90 leading-relaxed py-4" role="alert">
                        {alertsError}
                    </p>
                ) : showLoadingSkeleton ? (
                    <HomeHubAlertsLoadingSkeleton />
                ) : showPrimaryAlerts && hasAnyHorizonContent ? (
                    <>
                        <div className="hami-hub-horizon-row">
                            <HorizonFilterTabs
                                counts={horizonCounts}
                                activeFilter={activeFilter}
                                onChange={onFilterChange}
                                horizons={HOME_HUB_ALERT_HORIZONS}
                                compact
                            />
                            <HomeHubTabMoreTrigger
                                count={overflowCount}
                                onClick={() =>
                                    isUrgentTab ? setUrgentOverlayOpen(true) : setUpcomingOverlayOpen(true)
                                }
                                ariaLabel={
                                    isUrgentTab
                                        ? `عرض ${overflowCount} تنبيهات عاجلة إضافية`
                                        : `عرض ${overflowCount} مواعيد قادمة إضافية`
                                }
                                testId={
                                    isUrgentTab
                                        ? 'home-hub-urgent-more-trigger'
                                        : 'home-hub-alerts-more-trigger'
                                }
                            />
                        </div>

                        <div
                            className="hami-hub-alerts-feed"
                            data-testid="home-hub-alerts-feed"
                            style={
                                keyboardInset > 0
                                    ? {
                                          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom, 0px))`,
                                      }
                                    : undefined
                            }
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
                                    />
                                ) : (
                                    <HomeHubAlertsList
                                        split={upcomingSplit}
                                        sourceById={sourceById}
                                        onDismissAlert={onDismissAlert}
                                        onOpenEntity={onOpenEntity}
                                    />
                                )
                            ) : (
                                <HomeHubEmptyState
                                    message={HOME_HUB_ALERTS_EMPTY_COPY['empty-filter']}
                                    compact
                                />
                            )}
                        </div>

                        <HomeHubUrgentMoreOverlay
                            open={urgentOverlayOpen}
                            radarEvents={urgentSplit.overflowRadar}
                            carouselAlerts={urgentSplit.overflowAlerts}
                            sourceById={sourceById}
                            onClose={() => setUrgentOverlayOpen(false)}
                            onNavigate={onNavigate}
                            onDismissRadar={onDismissRadar}
                            onDismissAlert={onDismissAlert}
                            onOpenEntity={onOpenEntity}
                        />
                        <HomeHubAlertsMoreOverlay
                            open={upcomingOverlayOpen}
                            carouselAlerts={upcomingSplit.overflowAlerts}
                            sourceById={sourceById}
                            onClose={() => setUpcomingOverlayOpen(false)}
                            onDismissAlert={onDismissAlert}
                            onOpenEntity={onOpenEntity}
                        />
                    </>
                ) : showPrimaryAlerts && !hasAnyHorizonContent ? (
                    <HomeHubEmptyState
                        message={hubFullyEmpty ? HOME_HUB_FULLY_EMPTY_COPY : HOME_HUB_ALERTS_EMPTY_COPY.empty}
                        testId={hubFullyEmpty ? 'home-hub-fully-empty' : 'home-hub-alerts-empty'}
                        compact
                    />
                ) : alertsEmptyState === 'empty' ? (
                    <HomeHubEmptyState
                        message={hubFullyEmpty ? HOME_HUB_FULLY_EMPTY_COPY : HOME_HUB_ALERTS_EMPTY_COPY.empty}
                        testId={hubFullyEmpty ? 'home-hub-fully-empty' : 'home-hub-alerts-empty'}
                        compact
                    />
                ) : null}
            </div>
        </div>
    );
}
