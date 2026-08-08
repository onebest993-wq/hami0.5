import React, { memo } from 'react';
import './LawyerHomeHubCard/homeHubCardFx.css';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { HomeBlockPatternOverlay } from './dashboard/HomeBlockPatternOverlay';
import { HomeMoroccanGlassDecor } from './dashboard/HomeMoroccanGlassDecor';
import { HomeHubPanelBody } from './LawyerHomeHubCard/components/HomeHubPanelBody';
import { HubPanelTabs } from './LawyerHomeHubCard/components/HubPanelTabs';
import {
    useLawyerHomeHubCard,
    type UseLawyerHomeHubCardParams,
} from './LawyerHomeHubCard/hooks/useLawyerHomeHubCard';

export type LawyerHomeHubCardProps = UseLawyerHomeHubCardParams;

export const LawyerHomeHubCard = memo(function LawyerHomeHubCard(props: LawyerHomeHubCardProps) {
    const reduceMotion = useReduceMotion();
    const vm = useLawyerHomeHubCard(props);
    const { blockOverride, themePrimary = '#E6C673', layoutEditMode = false, clusterScanSources, secretaryAlerts } =
        props;

    return (
        <section
            data-hami-block="alerts"
            data-testid="home-hub-card"
            data-hub-state={vm.hubInitialPending ? 'loading' : vm.hubFullyEmpty ? 'empty' : 'content'}
            data-hub-layout-mode={vm.cardLayout.mode}
            data-hub-active-panel={vm.hubPanel}
            className={`relative flex flex-col ${vm.containerBorderOn ? 'border' : 'border-0'} ${vm.blockClasses} ${vm.cardLayout.sectionMinHeightClass} min-h-0 gap-3`}
            style={vm.blockStyle}
            data-hami-block-border={vm.containerBorderOn ? '1' : '0'}
            dir="rtl"
            aria-label="التنبيهات والسكرتير والتثبيت"
            aria-busy={vm.hubInitialPending || undefined}
        >
            <HomeBlockPatternOverlay blockId="alerts" override={blockOverride} themePrimary={themePrimary} />
            <HomeMoroccanGlassDecor pattern={blockOverride?.pattern} blockOverride={blockOverride} />
            {vm.showSheen ? (
                <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none z-[1]" aria-hidden />
            ) : null}

            <HubPanelTabs
                hubPanel={vm.hubPanel}
                onChange={vm.selectHubPanel}
                alertsCount={vm.alertsTabCount}
                secretaryCount={vm.secretaryTabCount}
                pinsCount={vm.pinsTabCount}
                reduceMotion={reduceMotion}
                layoutEditMode={layoutEditMode}
            />

            <div className={`hami-hub-readable-panels relative z-[2] flex flex-col min-h-0 ${vm.cardLayout.bodyRegionClass}`}>
                <HomeHubPanelBody
                    vm={vm}
                    clusterScanSources={clusterScanSources}
                    secretaryAlerts={secretaryAlerts}
                />
            </div>
        </section>
    );
});
