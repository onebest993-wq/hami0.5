import React, { memo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { HomeBlockPatternOverlay } from './dashboard/HomeBlockPatternOverlay';
import { HomeMoroccanGlassDecor } from './dashboard/HomeMoroccanGlassDecor';
import { HomeHubAlertsPanel } from './LawyerHomeHubCard/components/HomeHubAlertsPanel';
import { HomeHubPinsPanel } from './LawyerHomeHubCard/components/HomeHubPinsPanel';
import { HubPanelTabs } from './LawyerHomeHubCard/components/HubPanelTabs';
import {
    useLawyerHomeHubCard,
    type UseLawyerHomeHubCardParams,
} from './LawyerHomeHubCard/hooks/useLawyerHomeHubCard';

export type LawyerHomeHubCardProps = UseLawyerHomeHubCardParams;

export const LawyerHomeHubCard = memo(function LawyerHomeHubCard(props: LawyerHomeHubCardProps) {
    const reduceMotion = useReduceMotion();
    const vm = useLawyerHomeHubCard(props);
    const { blockOverride, themePrimary = '#E6C673', layoutEditMode = false } = props;

    return (
        <section
            data-hami-block="alerts"
            data-testid="home-hub-card"
            data-hub-state={vm.hubInitialPending ? 'loading' : vm.hubFullyEmpty ? 'empty' : 'content'}
            className={`relative flex flex-col border ${vm.blockClasses} ${vm.alertsMinH} min-h-0 gap-3`}
            style={vm.blockStyle}
            dir="rtl"
            aria-label="التنبيهات والتثبيت"
            aria-busy={vm.hubInitialPending || undefined}
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} />
            {vm.showSheen ? (
                <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none z-[1]" aria-hidden />
            ) : null}

            <HubPanelTabs
                hubPanel={vm.hubPanel}
                onChange={vm.selectHubPanel}
                alertsCount={vm.alertsTabCount}
                pinsCount={vm.clusterViews.length}
                reduceMotion={reduceMotion}
                layoutEditMode={layoutEditMode}
            />

            <div className="relative z-[2] flex flex-col min-h-0 flex-1">
                <HomeHubAlertsPanel
                    hubPanel={vm.hubPanel}
                    hasCarouselAlerts={vm.hasCarouselAlerts}
                    horizonCounts={vm.horizonCounts}
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
                    radarEvents={vm.radarFiltered}
                    onNavigate={vm.guardedNavigateRoute}
                    onDismissRadar={vm.guardedDismissRadar}
                    hubFullyEmpty={vm.hubFullyEmpty}
                />
                <HomeHubPinsPanel
                    hubPanel={vm.hubPanel}
                    clusterViews={vm.clusterViews}
                    onNavigate={vm.guardedNavigateRoute}
                    onUnpin={vm.guardedUnpin}
                    hubFullyEmpty={vm.hubFullyEmpty}
                />
            </div>
        </section>
    );
});
