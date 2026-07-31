import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    computeHomeHubAlertsTabCount,
    HOME_HUB_CARD_FEATURE,
    isHomeHubFullyEmpty,
    openHomeHubCardInteraction,
    resolveHomeHubAlertsEmptyState,
    type HomeHubAlertsEmptyState,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveAlertsMinHeight,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { useClusterAggregator } from '@/app/workspace/useClusterAggregator';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';
import type { ClusterPinView } from '@/app/workspace/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsFromSecretary } from '../../NeuralAlertsCard/useNeuralAlertsFromSecretary';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { createHomeHubGuardedActions } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions';
import { useHomeHubHorizonSync } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubHorizonSync';
import { useHomeHubLifecycle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle';
import { useHomeHubPanelState } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState';
import { useHomeHubRadarState } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubRadarState';

export type UseLawyerHomeHubCardParams = {
    lawyerId: string | null;
    shellAuthUserId?: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading?: boolean;
    alertsError?: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary?: string;
    layoutEditMode?: boolean;
};

export type LawyerHomeHubCardViewModel = {
    hubPanel: HomeHubPanel;
    selectHubPanel: (panel: HomeHubPanel) => void;
    hubFullyEmpty: boolean;
    hubInitialPending: boolean;
    blockClasses: string;
    blockStyle: CSSProperties;
    showSheen: boolean;
    alertsTabCount: number;
    alertsEmptyState: HomeHubAlertsEmptyState;
    alertsError: string | null;
    hasCarouselAlerts: boolean;
    hasAlerts: boolean;
    hasRadar: boolean;
    horizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    radarFiltered: CalendarRadarEvent[];
    clusterViews: ClusterPinView[];
    hasPins: boolean;
    alertsLayoutKey: string;
    alertsMinH: string;
    guardInteraction: (onProceed: () => void) => void;
    guardedDismissAlert?: (id: string) => void;
    guardedOpenEntity: (alert: SecretaryAlert) => void;
    guardedAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    guardedResolved?: (alert: SecretaryAlert) => void;
    guardedNavigateRoute: (routePath: string) => void;
    guardedDismissRadar: (eventId: string) => void;
    guardedUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

export function useLawyerHomeHubCard({
    lawyerId,
    shellAuthUserId,
    clusterScanSources,
    secretaryAlerts,
    alertsLoading = false,
    alertsError = null,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAcceptedConvertToCase,
    onResolved,
    blockOverride,
    themePrimary = '#E6C673',
}: UseLawyerHomeHubCardParams): LawyerHomeHubCardViewModel {
    const { settings } = useLawyerSettings();
    const {
        counts: horizonCounts,
        carouselTotal,
        alertsForFilter,
        sourcesForFilter,
    } = useNeuralAlertsFromSecretary(secretaryAlerts);

    const activeFilter = useNeuralAlertsStore((s) => s.activeFilter);
    const setActiveFilter = useNeuralAlertsStore((s) => s.setActiveFilter);

    useHomeHubHorizonSync({
        carouselTotal,
        horizonCounts,
        activeFilter,
        setActiveFilter,
    });

    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);
    const unpinItem = useWorkspaceStore((s) => s.unpinItem);
    const signedIn = isRealSignedIn(shellAuthUserId ?? lawyerId);

    const guardInteraction = useCallback(
        (onProceed: () => void) => {
            openHomeHubCardInteraction({
                signedIn,
                onProceed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`),
            });
        },
        [signedIn],
    );

    const clusterViews = useClusterAggregator({
        pinnedItems,
        lawsuitFiles: clusterScanSources.lawsuitFiles,
        executionFiles: clusterScanSources.executionFiles,
        criminalCases: clusterScanSources.criminalCases,
        urgentCases: clusterScanSources.urgentCases,
        threadingTransactions: clusterScanSources.threadingTransactions,
        notes: clusterScanSources.notes,
        fieldTasks: clusterScanSources.fieldTasks,
    });

    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = alertsForFilter(activeFilter);
        const sources = sourcesForFilter(activeFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [alertsForFilter, sourcesForFilter, activeFilter]);

    const { radarFiltered, radarLoading, hasRadar } = useHomeHubRadarState(lawyerId, secretaryAlerts);

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const hubInitialPending =
        Boolean(alertsLoading || radarLoading) &&
        !hasCarouselAlerts &&
        !hasRadar &&
        clusterViews.length === 0 &&
        !alertsError;
    const showInitialLoad =
        (alertsLoading && !hasCarouselAlerts && !alertsError) ||
        (radarLoading && !hasRadar && !hasCarouselAlerts && !alertsError);
    const hasPins = clusterViews.length > 0;
    const alertsTabCount = computeHomeHubAlertsTabCount(
        carouselTotal,
        hasCarouselAlerts,
        radarFiltered.length,
    );
    const alertsEmptyState = resolveHomeHubAlertsEmptyState({
        alertsError,
        showInitialLoad,
        hasAlerts,
        hasCarouselAlerts,
        hasRadar,
        radarLoading,
    });
    const hubFullyEmpty = isHomeHubFullyEmpty({
        alertsTabCount,
        pinsCount: clusterViews.length,
        alertsError,
        showInitialLoad,
        hubInitialPending,
    });

    useHomeHubLifecycle({
        lawyerId,
        alertsLoading,
        hubFullyEmpty,
        alertsTabCount,
        pinsCount: clusterViews.length,
        radarLoading,
    });

    const { hubPanel, selectHubPanel } = useHomeHubPanelState(alertsTabCount, clusterViews.length);

    const blockClasses = resolveHomeBlockClassNames(blockOverride);
    const blockStyle: CSSProperties = {
        ...resolveHomeBlockInlineStyle(
            blockOverride ? { ...blockOverride, heightPx: undefined } : undefined,
            themePrimary,
            {
                baseMinHeightPx: 240,
                skipHeightPx: true,
                skipContentScale: true,
                defaultGlassOpacity: settings.appearance.glassOpacity,
            },
        ),
        padding: `calc(1rem * var(--hami-content-scale, 1))`,
    };
    const alertsMinH = resolveAlertsMinHeight(blockOverride?.size ?? 'normal');
    const alertsLayoutKey = `${blockOverride?.size ?? 'normal'}-${blockOverride?.shape ?? 'rounded'}-${blockOverride?.span ?? 2}`;

    const {
        guardedDismissAlert,
        guardedOpenEntity,
        guardedAcceptedConvertToCase,
        guardedResolved,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
    } = createHomeHubGuardedActions({
        signedIn,
        lawyerId,
        guardInteraction,
        onNavigateRoute,
        onOpenEntity,
        onDismissAlert,
        onAcceptedConvertToCase,
        onResolved,
        unpinItem,
    });

    return {
        hubPanel,
        selectHubPanel,
        hubFullyEmpty,
        hubInitialPending,
        blockClasses,
        blockStyle,
        showSheen: shouldShowHomeBlockSheen(blockOverride?.pattern),
        alertsTabCount,
        alertsEmptyState,
        alertsError,
        hasCarouselAlerts,
        hasAlerts,
        hasRadar,
        horizonCounts,
        activeFilter,
        setActiveFilter,
        carouselAlerts,
        sourceById,
        radarFiltered,
        clusterViews,
        hasPins,
        alertsLayoutKey,
        alertsMinH,
        guardInteraction,
        guardedDismissAlert,
        guardedOpenEntity,
        guardedAcceptedConvertToCase,
        guardedResolved,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
    };
}
