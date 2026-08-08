import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    computeHomeHubAlertsTabBadgeOffPanel,
    computeHomeHubAlertsTabCount,
    computeHomeHubSecretaryTabCount,
    computeHomeHubHorizonTabCounts,
    countHomeHubDossierPins,
    HOME_HUB_CARD_FEATURE,
    isHomeHubFullyEmpty,
    openHomeHubCardInteraction,
    resolveHomeHubAlertsEmptyState,
    type HomeHubAlertsEmptyState,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import { resolveHomeHubCardLayout, type HomeHubCardLayout } from '@/app/services/alerts/homeHubCardLayout';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    resolveBlockContainerBorder,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { mergeBlockScopedAppearance } from '@/app/services/settings/themeResolve';
import { useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { ClusterPinView } from '@/app/workspace/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsFromSecretary } from '../../NeuralAlertsCard/useNeuralAlertsFromSecretary';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { createHomeHubGuardedActions } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions';
import { useClusterAggregatorGated } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useClusterAggregatorGated';
import { useHomeHubDeferredBadgeCounts } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubDeferredBadgeCounts';
import { useHomeHubHorizonSync } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubHorizonSync';
import { useHomeHubLifecycle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle';
import { useHomeHubPanelState } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState';
import {
    peekHomeHubRadarUrgentForBadges,
    useHomeHubRadarStateGated,
} from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubRadarStateGated';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';
import { peekHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import { peekHomeHubSecretaryAlertsCache } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import {
    countHomeHubSparkInsightsForSecretaryTab,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';

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
    secretaryTabCount: number;
    alertsEmptyState: HomeHubAlertsEmptyState;
    alertsError: string | null;
    hasCarouselAlerts: boolean;
    hasAlerts: boolean;
    hasUrgentRadar: boolean;
    horizonCounts: Record<AlertTimeHorizon, number>;
    hubHorizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    radarUrgent: CalendarRadarEvent[];
    clusterViews: ClusterPinView[];
    hasPins: boolean;
    pinsTabCount: number;
    alertsLayoutKey: string;
    cardLayout: HomeHubCardLayout;
    guardInteraction: (onProceed: () => void) => void;
    guardedDismissAlert?: (id: string) => void;
    guardedOpenEntity: (alert: SecretaryAlert) => void;
    guardedAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    guardedResolved?: (alert: SecretaryAlert) => void;
    guardedNavigateRoute: (routePath: string) => void;
    guardedDismissRadar: (eventId: string) => void;
    guardedUnpin: (id: string, type: ClusterPinView['pin']['type']) => void;
};

function peekHomeHubBadgeSnapshot(
    lawyerId: string | null,
    clusterScanSources: ClusterScanSources,
    secretaryAlerts: SecretaryAlert[],
): { secretaryTabCount: number; radarUrgent: CalendarRadarEvent[] } {
    const radarUrgent = peekHomeHubRadarUrgentForBadges(lawyerId, secretaryAlerts);
    const insights = resolveHomeHubSparkInsights(clusterScanSources, secretaryAlerts, radarUrgent);
    return {
        secretaryTabCount: computeHomeHubSecretaryTabCount(
            countHomeHubSparkInsightsForSecretaryTab(insights),
        ),
        radarUrgent,
    };
}

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

    const pinsBadgeCount = useMemo(() => countHomeHubDossierPins(pinnedItems), [pinnedItems]);

    const peekBadges = useMemo(
        () => peekHomeHubBadgeSnapshot(lawyerId, clusterScanSources, secretaryAlerts),
        [clusterScanSources, lawyerId, secretaryAlerts],
    );

    const deferredBadges = useHomeHubDeferredBadgeCounts({
        lawyerId,
        clusterScanSources,
        secretaryAlerts,
        suspend: false,
    });

    const badgeRadarUrgent = deferredBadges.ready ? deferredBadges.radarUrgent : peekBadges.radarUrgent;
    const badgeSecretaryTabCount = deferredBadges.ready
        ? deferredBadges.secretaryTabCount
        : peekBadges.secretaryTabCount;

    const urgentSecretaryAlerts = useMemo(
        () => sourcesForFilter('urgent'),
        [sourcesForFilter],
    );

    const provisionalAlertsTabCount = useMemo(
        () => computeHomeHubAlertsTabBadgeOffPanel(urgentSecretaryAlerts),
        [urgentSecretaryAlerts],
    );

    const { hubPanel, selectHubPanel } = useHomeHubPanelState(
        provisionalAlertsTabCount,
        badgeSecretaryTabCount,
        pinsBadgeCount,
    );

    const alertsPanelActive = hubPanel === 'alerts';
    const secretaryPanelActive = hubPanel === 'secretary';
    const pinsPanelActive = hubPanel === 'pins';

    const clusterViews = useClusterAggregatorGated(pinsPanelActive, {
        pinnedItems,
        lawsuitFiles: clusterScanSources.lawsuitFiles,
        executionFiles: clusterScanSources.executionFiles,
        criminalCases: clusterScanSources.criminalCases,
        urgentCases: clusterScanSources.urgentCases,
        threadingTransactions: clusterScanSources.threadingTransactions,
        notes: clusterScanSources.notes,
        fieldTasks: clusterScanSources.fieldTasks,
    });

    const {
        radarUrgent: liveRadarUrgent,
        radarLoading,
    } = useHomeHubRadarStateGated(alertsPanelActive, lawyerId, secretaryAlerts);

    /** رادار لوحة التنبيهات فقط — لا كاش على الشارة خارج اللوحة */
    const radarUrgentForAlerts = useMemo(() => {
        if (!alertsPanelActive) return [];
        if (liveRadarUrgent.length > 0) return liveRadarUrgent;
        if (radarLoading && badgeRadarUrgent.length > 0) return badgeRadarUrgent;
        return liveRadarUrgent;
    }, [alertsPanelActive, badgeRadarUrgent, liveRadarUrgent, radarLoading]);

    const radarUrgent = alertsPanelActive ? radarUrgentForAlerts : badgeRadarUrgent;
    const hasUrgentRadar = radarUrgentForAlerts.length > 0;

    const liveSecretaryTabCount = useMemo(() => {
        if (!secretaryPanelActive) return badgeSecretaryTabCount;
        const insights = resolveHomeHubSparkInsights(
            clusterScanSources,
            secretaryAlerts,
            radarUrgent,
        );
        return computeHomeHubSecretaryTabCount(
            countHomeHubSparkInsightsForSecretaryTab(insights),
        );
    }, [
        badgeSecretaryTabCount,
        clusterScanSources,
        radarUrgent,
        secretaryAlerts,
        secretaryPanelActive,
    ]);

    const scheduledFilter: AlertTimeHorizon =
        activeFilter === 'near' || activeFilter === 'upcoming' ? 'upcoming' : 'urgent';

    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = alertsForFilter(scheduledFilter);
        const sources = sourcesForFilter(scheduledFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [alertsForFilter, sourcesForFilter, scheduledFilter]);

    const hubHorizonCounts = useMemo(
        () =>
            alertsPanelActive
                ? computeHomeHubHorizonTabCounts(
                      horizonCounts,
                      urgentSecretaryAlerts,
                      radarUrgentForAlerts,
                  )
                : { urgent: 0, near: 0, upcoming: 0 },
        [alertsPanelActive, horizonCounts, urgentSecretaryAlerts, radarUrgentForAlerts],
    );

    const alertsPanelHorizonInitRef = useRef(false);
    useEffect(() => {
        if (!alertsPanelActive) {
            alertsPanelHorizonInitRef.current = false;
            return undefined;
        }
        if (alertsPanelHorizonInitRef.current) return undefined;
        alertsPanelHorizonInitRef.current = true;
        setActiveFilter(pickDefaultHorizonFilter(hubHorizonCounts));
        return undefined;
    }, [alertsPanelActive, hubHorizonCounts, setActiveFilter]);

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const hadSecretaryCache = Boolean(
        secretaryAlerts.length > 0 ||
            (lawyerId && (peekHomeHubSecretaryAlertsCache(lawyerId)?.length ?? 0) > 0),
    );
    const hadRadarCachePeek = Boolean(lawyerId && (peekHomeHubRadarCache(lawyerId)?.length ?? 0) > 0);

    const pinCountForState = pinsPanelActive ? clusterViews.length : pinsBadgeCount;
    const hasPins = pinCountForState > 0;

    const alertsTabCount = useMemo(() => {
        if (!alertsPanelActive) {
            return computeHomeHubAlertsTabBadgeOffPanel(urgentSecretaryAlerts);
        }
        return computeHomeHubAlertsTabCount(
            hubHorizonCounts.upcoming,
            urgentSecretaryAlerts,
            radarUrgentForAlerts,
        );
    }, [
        alertsPanelActive,
        hubHorizonCounts.upcoming,
        urgentSecretaryAlerts,
        radarUrgentForAlerts,
    ]);

    const hubInitialPending =
        Boolean(alertsLoading || (alertsPanelActive && radarLoading)) &&
        !hasCarouselAlerts &&
        !hasUrgentRadar &&
        pinCountForState === 0 &&
        liveSecretaryTabCount === 0 &&
        !alertsError &&
        !hadSecretaryCache &&
        !hadRadarCachePeek;

    const showInitialLoad =
        (alertsLoading &&
            !hasCarouselAlerts &&
            !hasUrgentRadar &&
            !alertsError &&
            !hadSecretaryCache) ||
        (alertsPanelActive && radarLoading && !hasUrgentRadar && !hasCarouselAlerts && !alertsError);

    const alertsEmptyState = resolveHomeHubAlertsEmptyState({
        alertsError,
        showInitialLoad,
        hubInitialPending,
        hasAlerts,
        hasCarouselAlerts,
        hasRadar: hasUrgentRadar,
        radarLoading: alertsPanelActive && radarLoading,
    });

    const hubFullyEmpty = isHomeHubFullyEmpty({
        alertsTabCount,
        secretaryTabCount: liveSecretaryTabCount,
        pinsCount: pinCountForState,
        alertsError,
        showInitialLoad,
        hubInitialPending,
    });

    useHomeHubLifecycle({
        lawyerId,
        alertsLoading,
        hubFullyEmpty,
        alertsTabCount,
        pinsCount: pinCountForState,
        radarLoading: alertsPanelActive && radarLoading,
    });

    const blockClasses = resolveHomeBlockClassNames(blockOverride, settings.appearance.shape);
    const scopedAppearance = useMemo(
        () => mergeBlockScopedAppearance(settings.appearance, blockOverride),
        [settings.appearance, blockOverride],
    );
    const containerBorderOn = resolveBlockContainerBorder(
        blockOverride,
        settings.appearance.homeContainerBorder !== false,
    );
    const blockStyle: CSSProperties = {
        ...resolveHomeBlockInlineStyle(
            blockOverride ? { ...blockOverride, heightPx: undefined } : undefined,
            themePrimary,
            {
                baseMinHeightPx: 240,
                skipHeightPx: true,
                skipContentScale: true,
                defaultGlassOpacity: settings.appearance.glassOpacity,
                appearance: scopedAppearance,
            },
        ),
        padding: `calc(1rem * var(--hami-content-scale, 1))`,
    };
    const cardLayout = useMemo(
        () =>
            resolveHomeHubCardLayout({
                activePanel: hubPanel,
                pinCount: pinCountForState,
                blockSize: blockOverride?.size ?? 'normal',
            }),
        [hubPanel, pinCountForState, blockOverride?.size],
    );
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
        containerBorderOn,
        showSheen: shouldShowHomeBlockSheen(blockOverride?.pattern),
        alertsTabCount,
        secretaryTabCount: liveSecretaryTabCount,
        alertsEmptyState,
        alertsError,
        hasCarouselAlerts,
        hasAlerts,
        hasUrgentRadar,
        horizonCounts,
        hubHorizonCounts,
        activeFilter,
        setActiveFilter,
        carouselAlerts,
        sourceById,
        radarUrgent,
        clusterViews,
        hasPins,
        pinsTabCount: pinsBadgeCount,
        alertsLayoutKey,
        cardLayout,
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
