import React, { memo } from 'react';
import { hasStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { LawyerHomeHubCardViewModel } from '../hooks/useLawyerHomeHubCard';
import { HomeHubAlertsLoadingSkeleton } from './HomeHubAlertsLoadingSkeleton';
import { HomeHubAlertsPanel } from './HomeHubAlertsPanel';
import { HomeHubPinsPanel } from './HomeHubPinsPanel';
import { HomeHubSecretaryPanel } from './HomeHubSecretaryPanel';

export type HomeHubPanelBodyProps = {
    vm: LawyerHomeHubCardViewModel;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
};

function panelHidden(active: HomeHubPanel, panel: HomeHubPanel): boolean {
    return active !== panel;
}

/** keep-alive للوحات الثلاث من أول render — تبديل التبويب فوري */
export const HomeHubPanelBody = memo(function HomeHubPanelBody({
    vm,
    clusterScanSources,
    secretaryAlerts,
}: HomeHubPanelBodyProps) {
    if (vm.hubInitialPending && vm.hubPanel === 'alerts') {
        return hasStaticBootShell() ? (
            <div className="hami-hub-alerts-loading" aria-hidden style={{ minHeight: '15rem' }} />
        ) : (
            <HomeHubAlertsLoadingSkeleton />
        );
    }

    return (
        <>
            <div hidden={panelHidden(vm.hubPanel, 'alerts')}>
                <HomeHubAlertsPanel
                    hasCarouselAlerts={vm.hasCarouselAlerts}
                    horizonCounts={vm.hubHorizonCounts}
                    activeFilter={vm.activeFilter}
                    onFilterChange={vm.setActiveFilter}
                    alertsEmptyState={vm.alertsEmptyState}
                    alertsError={vm.alertsError}
                    hasAlerts={vm.hasAlerts}
                    carouselAlerts={vm.carouselAlerts}
                    sourceById={vm.sourceById}
                    onDismissAlert={vm.guardedDismissAlert}
                    onOpenEntity={vm.guardedOpenEntity}
                    onAcceptedConvertToCase={vm.guardedAcceptedConvertToCase}
                    onResolved={vm.guardedResolved}
                    alertsLayoutKey={vm.alertsLayoutKey}
                    radarEvents={vm.radarUrgent}
                    onNavigate={vm.guardedNavigateRoute}
                    onDismissRadar={vm.guardedDismissRadar}
                    hubFullyEmpty={vm.hubFullyEmpty}
                    hubInitialPending={vm.hubInitialPending}
                />
            </div>
            <div hidden={panelHidden(vm.hubPanel, 'secretary')}>
                <HomeHubSecretaryPanel
                    clusterScanSources={clusterScanSources}
                    secretaryAlerts={secretaryAlerts}
                    radarEvents={vm.radarUrgent}
                    onNavigate={vm.guardedNavigateRoute}
                />
            </div>
            <div hidden={panelHidden(vm.hubPanel, 'pins')}>
                <HomeHubPinsPanel
                    clusterViews={vm.clusterViews}
                    onNavigate={vm.guardedNavigateRoute}
                    onUnpin={vm.guardedUnpin}
                    hubFullyEmpty={vm.hubFullyEmpty}
                />
            </div>
        </>
    );
});
