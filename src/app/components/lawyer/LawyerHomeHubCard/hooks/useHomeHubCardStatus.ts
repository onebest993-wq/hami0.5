import { useMemo, useRef } from 'react';
import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import {
    isHomeHubFullyEmpty,
    resolveHomeHubAlertsEmptyState,
    resolveHomeHubInitialPending,
    resolveHomeHubShowInitialLoad,
    type HomeHubAlertsEmptyState,
} from '@/app/services/alerts/homeHubCardLogic';
import {
    resolveHomeHubCardLayout,
    resolveStableHubHasItems,
    type HomeHubCardLayout,
} from '@/app/services/alerts/homeHubCardLayout';
import type { HomeBlockSize } from '@/app/services/settings/homeLayout';

type HomeHubCardStatus = {
    hubInitialPending: boolean;
    alertsEmptyState: HomeHubAlertsEmptyState;
    hubHasItems: boolean;
    hubFullyEmpty: boolean;
    cardLayout: HomeHubCardLayout;
};

/** فراغ / تحميل / عناصر / تخطيط — بعد استقرار العدّ. */
export function useHomeHubCardStatus({
    alertsLoading,
    alertsError,
    alertsPanelActive,
    radarLoading,
    hasCarouselAlerts,
    hasUrgentRadar,
    hasAlerts,
    pinCountForState,
    alertsTabCount,
    hadSecretaryCache,
    hadRadarCachePeek,
    hubBootSettling,
    hubPanel,
    blockSize,
}: {
    alertsLoading: boolean;
    alertsError: string | null;
    alertsPanelActive: boolean;
    radarLoading: boolean;
    hasCarouselAlerts: boolean;
    hasUrgentRadar: boolean;
    hasAlerts: boolean;
    pinCountForState: number;
    alertsTabCount: number;
    hadSecretaryCache: boolean;
    hadRadarCachePeek: boolean;
    hubBootSettling: boolean;
    hubPanel: HomeHubPanel;
    blockSize: HomeBlockSize | undefined;
}): HomeHubCardStatus {
    const hubInitialPending = resolveHomeHubInitialPending({
        alertsLoading,
        alertsPanelActive,
        radarLoading,
        hasCarouselAlerts,
        hasUrgentRadar,
        pinCountForState,
        alertsError,
        hadSecretaryCache,
        hadRadarCachePeek,
    });

    const showInitialLoad = resolveHomeHubShowInitialLoad({
        alertsLoading,
        hasCarouselAlerts,
        hasUrgentRadar,
        alertsError,
        hadSecretaryCache,
        alertsPanelActive,
        radarLoading,
    });

    const alertsEmptyState = resolveHomeHubAlertsEmptyState({
        alertsError,
        showInitialLoad,
        hubInitialPending,
        hasAlerts,
        hasCarouselAlerts,
        hasRadar: hasUrgentRadar,
        radarLoading: alertsPanelActive && radarLoading,
    });

    const hubHasItemsLatchRef = useRef(false);
    const hubHasItems = resolveStableHubHasItems(
        alertsTabCount > 0 || pinCountForState > 0,
        hubBootSettling,
        hubHasItemsLatchRef,
    );

    const hubFullyEmpty = isHomeHubFullyEmpty({
        alertsTabCount,
        pinsCount: pinCountForState,
        alertsError,
        showInitialLoad,
        hubInitialPending,
    });

    const cardLayout = useMemo(
        () =>
            resolveHomeHubCardLayout({
                activePanel: hubPanel,
                pinCount: pinCountForState,
                blockSize: blockSize ?? 'normal',
                /* حدّ الـ feed فقط بعد الاستقرار مع عناصر — لا 240 أثناء التسوية */
                hasFeedContent: hubHasItems && !hubBootSettling,
            }),
        [blockSize, hubBootSettling, hubHasItems, hubPanel, pinCountForState],
    );

    return {
        hubInitialPending,
        alertsEmptyState,
        hubHasItems,
        hubFullyEmpty,
        cardLayout,
    };
}
