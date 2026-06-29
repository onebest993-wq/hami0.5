import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    buildCalendarAlertIdSet,
    computeHomeHubAlertsTabCount,
    filterRadarEventsExcludingCalendarAlerts,
    HOME_HUB_CARD_FEATURE,
    guardedHomeHubNavigateRoute,
    isHomeHubFullyEmpty,
    openHomeHubCardInteraction,
    resolveDefaultHomeHubPanel,
    resolveHomeHubAlertsEmptyState,
    type HomeHubAlertsEmptyState,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import { pickDefaultHorizonFilter, type AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveAlertsMinHeight,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { syncHorizonFilterIfEmpty, useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { useCalendarRadar48h } from '@/app/workspace/useCalendarRadar48h';
import { useClusterAggregator } from '@/app/workspace/useClusterAggregator';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';
import type { ClusterPinView } from '@/app/workspace/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsFromSecretary } from '../../NeuralAlertsCard/useNeuralAlertsFromSecretary';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { warmHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import { useHomeHubLifecycle } from './useHomeHubLifecycle';

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
};

export type LawyerHomeHubCardViewModel = {
    hubPanel: HomeHubPanel;
    selectHubPanel: (panel: HomeHubPanel) => void;
    hubFullyEmpty: boolean;
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
    const horizonInitRef = useRef(false);
    const prevHorizonCountsRef = useRef(horizonCounts);

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

    useEffect(() => {
        if (carouselTotal === 0) {
            horizonInitRef.current = false;
            return;
        }
        if (!horizonInitRef.current) {
            setActiveFilter(pickDefaultHorizonFilter(horizonCounts));
            horizonInitRef.current = true;
        }
    }, [carouselTotal, horizonCounts, setActiveFilter]);

    useEffect(() => {
        const prev = prevHorizonCountsRef.current;
        prevHorizonCountsRef.current = horizonCounts;
        if (!horizonInitRef.current || carouselTotal === 0) return;

        const hadItems = prev[activeFilter] > 0;
        const nowEmpty = horizonCounts[activeFilter] === 0;
        if (hadItems && nowEmpty) {
            const next = syncHorizonFilterIfEmpty(horizonCounts, activeFilter);
            if (next) setActiveFilter(next);
        }
    }, [horizonCounts, activeFilter, carouselTotal, setActiveFilter]);

    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = alertsForFilter(activeFilter);
        const sources = sourcesForFilter(activeFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [alertsForFilter, sourcesForFilter, activeFilter]);

    const { events: radarEvents, loading: radarLoading } = useCalendarRadar48h(lawyerId);

    useEffect(() => {
        warmHomeHubRadarCache(lawyerId);
    }, [lawyerId]);

    const alertCalendarIds = useMemo(
        () => buildCalendarAlertIdSet(secretaryAlerts),
        [secretaryAlerts],
    );

    const radarFiltered = useMemo(
        () => filterRadarEventsExcludingCalendarAlerts(radarEvents, alertCalendarIds),
        [radarEvents, alertCalendarIds],
    );

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const showInitialLoad = alertsLoading && !hasCarouselAlerts && !alertsError;
    const hasRadar = radarFiltered.length > 0;
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
    });
    const hubFullyEmpty = isHomeHubFullyEmpty({
        alertsTabCount,
        pinsCount: clusterViews.length,
        alertsError,
        showInitialLoad,
    });

    useHomeHubLifecycle({
        lawyerId,
        alertsLoading,
        hubFullyEmpty,
        alertsTabCount,
        pinsCount: clusterViews.length,
        radarLoading,
    });

    const [hubPanel, setHubPanelState] = useState<HomeHubPanel>('alerts');
    const selectHubPanel = useCallback((panel: HomeHubPanel) => {
        setHubPanelState(panel);
        requestAnimationFrame(() => {
            document.getElementById(`home-hub-tab-${panel}`)?.focus();
        });
    }, []);
    const panelInitRef = useRef(false);

    useEffect(() => {
        if (panelInitRef.current) return;
        if (alertsTabCount === 0 && clusterViews.length === 0) return;
        panelInitRef.current = true;
        setHubPanelState(resolveDefaultHomeHubPanel(alertsTabCount, clusterViews.length));
    }, [alertsTabCount, clusterViews.length]);

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
        padding: hubFullyEmpty
            ? `calc(0.5rem * var(--hami-content-scale, 1)) calc(0.875rem * var(--hami-content-scale, 1))`
            : `calc(1rem * var(--hami-content-scale, 1))`,
    };
    const alertsMinH = resolveAlertsMinHeight(blockOverride?.size ?? 'normal');
    const alertsLayoutKey = `${blockOverride?.size ?? 'normal'}-${blockOverride?.shape ?? 'rounded'}-${blockOverride?.span ?? 2}`;

    const guardedDismissAlert = onDismissAlert
        ? (id: string) => guardInteraction(() => onDismissAlert(id))
        : undefined;
    const guardedOpenEntity = (alert: SecretaryAlert) => guardInteraction(() => onOpenEntity(alert));
    const guardedAcceptedConvertToCase = onAcceptedConvertToCase
        ? (alert: SecretaryAlert) => guardInteraction(() => onAcceptedConvertToCase(alert))
        : undefined;
    const guardedResolved = onResolved
        ? (alert: SecretaryAlert) => guardInteraction(() => onResolved(alert))
        : undefined;
    const guardedNavigateRoute = (routePath: string) => {
        guardedHomeHubNavigateRoute(routePath, signedIn, onNavigateRoute, () =>
            SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`),
        );
    };
    const guardedUnpin = (id: string, type: ClusterPinView['pin']['type']) =>
        guardInteraction(() => unpinItem(id, type));

    return {
        hubPanel,
        selectHubPanel,
        hubFullyEmpty,
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
        guardedUnpin,
    };
}
