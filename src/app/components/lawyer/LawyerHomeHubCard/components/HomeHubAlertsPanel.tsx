import React, { memo } from 'react';
import './../homeHubAlertsFx.css';
import { HomeHubEmptyState } from '@/app/components/lawyer/dashboard/HomeHubEmptyState';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { CalendarRadarEvent, WorkspacePinnedItem } from '@/app/workspace/types';
import {
    HOME_HUB_ALERTS_EMPTY_COPY,
    HOME_HUB_ALERTS_ERROR_COPY,
    HOME_HUB_FULLY_EMPTY_COPY,
    type HomeHubAlertsEmptyState,
} from '@/app/services/alerts/homeHubCardLogic';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { HomeHubAlertsLoadingSkeleton } from './HomeHubAlertsLoadingSkeleton';
import { HomeHubAlertsPrimaryBody } from './HomeHubAlertsPrimaryBody';

type HomeHubAlertsPanelProps = {
    hasCarouselAlerts: boolean;
    horizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    onFilterChange: (filter: AlertTimeHorizon) => void;
    alertsEmptyState: HomeHubAlertsEmptyState;
    hasAlerts: boolean;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    radarEvents: CalendarRadarEvent[];
    onNavigate: (routePath: string) => void;
    onDismissRadar?: (eventId: string) => void;
    hubFullyEmpty?: boolean;
    hubInitialPending?: boolean;
    onTogglePin: (item: WorkspacePinnedItem) => void;
    isPinned: (id: string, type: WorkspacePinnedItem['type']) => boolean;
};

/**
 * صدفة لوحة التنبيهات — فارغة/خطأ/تحميل sync.
 * الجسم الغني sync في نفس مقطع التنبيهات؛ أوراق «المزيد» تبقى كسولة.
 */
export const HomeHubAlertsPanel = memo(function HomeHubAlertsPanel({
    hasCarouselAlerts,
    horizonCounts,
    activeFilter,
    onFilterChange,
    alertsEmptyState,
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
    onTogglePin,
    isPinned,
}: HomeHubAlertsPanelProps) {
    const hasRadar = radarEvents.length > 0;
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
                        {HOME_HUB_ALERTS_ERROR_COPY}
                    </p>
                ) : showLoadingSkeleton ? (
                    <HomeHubAlertsLoadingSkeleton />
                ) : showPrimaryAlerts && hasAnyHorizonContent ? (
                    <HomeHubAlertsPrimaryBody
                        horizonCounts={horizonCounts}
                        activeFilter={activeFilter}
                        onFilterChange={onFilterChange}
                        hasAlerts={hasAlerts}
                        carouselAlerts={carouselAlerts}
                        sourceById={sourceById}
                        onDismissAlert={onDismissAlert}
                        onOpenEntity={onOpenEntity}
                        radarEvents={radarEvents}
                        onNavigate={onNavigate}
                        onDismissRadar={onDismissRadar}
                        onTogglePin={onTogglePin}
                        isPinned={isPinned}
                    />
                ) : showPrimaryAlerts ? (
                    <HomeHubEmptyState
                        message={hubFullyEmpty ? HOME_HUB_FULLY_EMPTY_COPY : HOME_HUB_ALERTS_EMPTY_COPY.empty}
                        testId={hubFullyEmpty ? 'home-hub-fully-empty' : 'home-hub-alerts-empty'}
                        compact
                    />
                ) : null}
            </div>
        </div>
    );
});
