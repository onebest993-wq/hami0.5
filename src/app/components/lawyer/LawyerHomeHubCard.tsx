import React, { memo } from 'react';
import './LawyerHomeHubCard/homeHubCardFx.css';
import { HomeHubPanelBody } from './LawyerHomeHubCard/components/HomeHubPanelBody';
import { HubPanelTabs } from './LawyerHomeHubCard/components/HubPanelTabs';
import { useLawyerHomeHubCard } from './LawyerHomeHubCard/hooks/useLawyerHomeHubCard';
import type { LawyerHomeHubCardProps } from './LawyerHomeHubCard/hooks/lawyerHomeHubCard.types';

export const LawyerHomeHubCard = memo(function LawyerHomeHubCard(props: LawyerHomeHubCardProps) {
    const vm = useLawyerHomeHubCard(props);

    return (
        <section
            data-hami-block="alerts"
            data-testid="home-hub-card"
            data-hub-state={
                vm.hubBootSettling ? 'loading' : vm.hubInitialPending ? 'loading' : vm.hubFullyEmpty ? 'empty' : 'content'
            }
            data-hub-boot-settling={vm.hubBootSettling ? '1' : '0'}
            data-hub-has-items={vm.hubHasItems ? '1' : '0'}
            data-hub-layout-mode={vm.cardLayout.mode}
            data-hub-active-panel={vm.hubPanel}
            className={`relative flex flex-col min-h-0 flex-1 h-full ${vm.blockClasses} ${vm.cardLayout.sectionMinHeightClass} gap-1`}
            style={vm.blockStyle}
            data-hami-block-border={vm.containerBorderOn ? '1' : '0'}
            dir="rtl"
            aria-label="التنبيهات والتثبيت"
            aria-busy={vm.hubBootSettling || vm.hubInitialPending || undefined}
        >
            <HubPanelTabs
                hubPanel={vm.hubPanel}
                onChange={vm.selectHubPanel}
                alertsCount={vm.alertsTabCount}
                pinsCount={vm.pinsTabCount}
                bootSettling={vm.hubBootSettling}
            />

            <div className={`hami-hub-readable-panels relative z-[2] flex flex-col min-h-0 flex-1 ${vm.cardLayout.bodyRegionClass}`}>
                <HomeHubPanelBody vm={vm} />
            </div>
        </section>
    );
});
