import React, { Suspense, lazy, memo, useEffect, useState } from 'react';
import { hasStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { HomeHubEmptyState } from '@/app/components/lawyer/dashboard/HomeHubEmptyState';
import { HOME_HUB_FULLY_EMPTY_COPY, type HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import { prefetchHomeHubPinsPanel } from '../homeHub/homeHubPanelPrefetch';
import type { LawyerHomeHubCardViewModel } from '../hooks/lawyerHomeHubCard.types';
import { HomeHubAlertsLoadingSkeleton } from './HomeHubAlertsLoadingSkeleton';
import { HomeHubAlertsPanel } from './HomeHubAlertsPanel';

const LazyHomeHubPinsPanel = lazy(() =>
    import('./HomeHubPinsPanel').then((m) => ({ default: m.HomeHubPinsPanel })),
);

type HomeHubPanelBodyProps = {
    vm: LawyerHomeHubCardViewModel;
};

function panelHidden(active: HomeHubPanel, panel: HomeHubPanel): boolean {
    return active !== panel;
}

/**
 * جسم اللوحات تحت التبويبات.
 * التثبيت لا يُركَّب حتى أول فتح — يخفّف أول طلاء البطاقة الفارغة/التنبيهات.
 * التنبيهات تبعية ثابتة للمقطع (vite: lawyer-home-hub-alerts-feed) — تُحمَّل مع البطاقة بلا شلال Suspense.
 */
export const HomeHubPanelBody = memo(function HomeHubPanelBody({ vm }: HomeHubPanelBodyProps) {
    const [pinsEverOpened, setPinsEverOpened] = useState(() => vm.hubPanel === 'pins');

    useEffect(() => {
        if (vm.hubPanel === 'pins') setPinsEverOpened(true);
    }, [vm.hubPanel]);

    useEffect(() => {
        if (vm.hubBootSettling) return;
        if (vm.hubPanel === 'pins' || vm.pinsTabCount > 0) prefetchHomeHubPinsPanel();
    }, [vm.hubBootSettling, vm.hubPanel, vm.pinsTabCount]);

    /* تسوية أو انتظار بلا عناصر: نفس رسالة الفراغ النهائية — لا مستطيل تحميل ثم قفزة. */
    if (vm.hubBootSettling || (vm.hubInitialPending && !vm.hubHasItems)) {
        return (
            <HomeHubEmptyState
                message={HOME_HUB_FULLY_EMPTY_COPY}
                testId="home-hub-fully-empty"
                compact
            />
        );
    }

    if (vm.hubInitialPending && vm.hubPanel === 'alerts' && vm.hubHasItems) {
        return hasStaticBootShell() ? (
            <div
                className="hami-hub-alerts-loading"
                data-testid="home-hub-alerts-loading"
                aria-hidden
            />
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
                    hasAlerts={vm.hasAlerts}
                    carouselAlerts={vm.carouselAlerts}
                    sourceById={vm.sourceById}
                    onDismissAlert={vm.guardedDismissAlert}
                    onOpenEntity={vm.guardedOpenEntity}
                    radarEvents={vm.radarUrgent}
                    onNavigate={vm.guardedNavigateRoute}
                    onDismissRadar={vm.guardedDismissRadar}
                    onTogglePin={vm.guardedTogglePin}
                    isPinned={vm.isPinned}
                    hubFullyEmpty={vm.hubFullyEmpty}
                    hubInitialPending={vm.hubInitialPending}
                />
            </div>
            {pinsEverOpened ? (
                <div hidden={panelHidden(vm.hubPanel, 'pins')}>
                    {vm.hubFullyEmpty ? (
                        <div
                            id="home-hub-panel-pins"
                            role="tabpanel"
                            aria-labelledby="home-hub-tab-pins"
                            data-testid="home-hub-panel-pins"
                            className="hami-hub-pins-panel"
                        >
                            <HomeHubEmptyState
                                message={HOME_HUB_FULLY_EMPTY_COPY}
                                testId="home-hub-pins-empty"
                                compact
                            />
                        </div>
                    ) : (
                        <Suspense
                            fallback={
                                <div
                                    className="hami-hub-pins-panel"
                                    data-testid="home-hub-pins-loading"
                                    aria-busy="true"
                                    aria-label="جاري تحميل التثبيت"
                                />
                            }
                        >
                            <LazyHomeHubPinsPanel
                                enabled={vm.hubPanel === 'pins'}
                                aggregatorInput={vm.pinsAggregatorInput}
                                onNavigate={vm.guardedNavigateRoute}
                                onUnpin={vm.guardedUnpin}
                            />
                        </Suspense>
                    )}
                </div>
            ) : null}
        </>
    );
});
