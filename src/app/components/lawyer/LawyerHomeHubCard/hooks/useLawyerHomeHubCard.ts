import { useCallback, useMemo } from 'react';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    countHomeHubDossierPins,
    HOME_HUB_ALERTS_ERROR_COPY,
    HOME_HUB_CARD_FEATURE,
    openHomeHubCardInteraction,
} from '@/app/services/alerts/homeHubCardLogic';
import { createHomeHubGuardedActions } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions';
import { resolveHomeHubPinsAggregatorInput } from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPinsAggregatorInput';
import { useHomeHubAlertsLive } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubAlertsLive';
import { useHomeHubAlertsSource } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubAlertsSource';
import { useHomeHubBadgeSettling } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubBadgeSettling';
import { useHomeHubCardShellStyle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubCardShellStyle';
import { useHomeHubCardStatus } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubCardStatus';
import { useHomeHubLifecycle } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle';
import { useHomeHubPanelState } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState';
import { useHomeHubWorkspacePins } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubWorkspacePins';
import type {
    LawyerHomeHubCardViewModel,
    UseLawyerHomeHubCardParams,
} from './lawyerHomeHubCard.types';

function toastHubSignedOut(): void {
    void import('@/app/components/ui/SmartToast')
        .then((m) => {
            m.SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`);
        })
        .catch(() => undefined);
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
    blockOverride,
    themePrimary = '#E6C673',
}: UseLawyerHomeHubCardParams): LawyerHomeHubCardViewModel {
    const alertsSource = useHomeHubAlertsSource(secretaryAlerts);
    const { pinnedItems, isPinned, unpinItem, togglePin } = useHomeHubWorkspacePins();
    const signedIn = hasLocalAppSession(shellAuthUserId ?? lawyerId);
    const safeAlertsError = alertsError ? HOME_HUB_ALERTS_ERROR_COPY : null;

    const guardInteraction = useCallback(
        (onProceed: () => void) => {
            openHomeHubCardInteraction({
                signedIn,
                onProceed,
                onSignedOut: toastHubSignedOut,
            });
        },
        [signedIn],
    );

    const pinsBadgeCount = useMemo(() => countHomeHubDossierPins(pinnedItems), [pinnedItems]);

    const {
        lawsuitFiles,
        executionFiles,
        criminalCases,
        urgentCases,
        threadingTransactions,
        notes,
        fieldTasks,
    } = clusterScanSources;

    const pinsAggregatorInput = useMemo(
        () =>
            resolveHomeHubPinsAggregatorInput(pinnedItems, {
                lawsuitFiles,
                executionFiles,
                criminalCases,
                urgentCases,
                threadingTransactions,
                notes,
                fieldTasks,
            }),
        [
            pinnedItems,
            lawsuitFiles,
            executionFiles,
            criminalCases,
            urgentCases,
            threadingTransactions,
            notes,
            fieldTasks,
        ],
    );

    const {
        badgeRadarUrgent,
        hubBadgeCountsSettled,
        hubBootSettling,
        bootRevealDone,
        hadSecretaryCache,
        hadRadarCachePeek,
    } = useHomeHubBadgeSettling({
        lawyerId,
        secretaryAlerts,
    });

    const { hubPanel, selectHubPanel } = useHomeHubPanelState(
        alertsSource.provisionalAlertsTabCount,
        pinsBadgeCount,
        { badgeCountsSettled: hubBadgeCountsSettled && bootRevealDone },
    );

    const alertsPanelActive = hubPanel === 'alerts';

    const alertsLive = useHomeHubAlertsLive({
        lawyerId,
        secretaryAlerts,
        alertsPanelActive,
        badgeRadarUrgent,
        source: alertsSource,
    });

    const status = useHomeHubCardStatus({
        alertsLoading,
        alertsError: safeAlertsError,
        alertsPanelActive,
        radarLoading: alertsLive.radarLoading,
        hasCarouselAlerts: alertsLive.hasCarouselAlerts,
        hasUrgentRadar: alertsLive.hasUrgentRadar,
        hasAlerts: alertsLive.hasAlerts,
        pinCountForState: pinsBadgeCount,
        alertsTabCount: alertsLive.alertsTabCount,
        hadSecretaryCache,
        hadRadarCachePeek,
        hubBootSettling,
        hubPanel,
        blockSize: blockOverride?.size,
    });

    useHomeHubLifecycle({
        lawyerId,
        alertsLoading,
        hubFullyEmpty: status.hubFullyEmpty,
        alertsTabCount: alertsLive.alertsTabCount,
        pinsCount: pinsBadgeCount,
        radarLoading: alertsPanelActive && alertsLive.radarLoading,
        hadRadarCache: hadRadarCachePeek,
        hadAlertsCache: hadSecretaryCache,
    });

    const { blockClasses, blockStyle, containerBorderOn } = useHomeHubCardShellStyle(
        blockOverride,
        themePrimary,
    );

    const {
        guardedDismissAlert,
        guardedOpenEntity,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
        guardedTogglePin,
    } = useMemo(
        () =>
            createHomeHubGuardedActions({
                signedIn,
                lawyerId,
                guardInteraction,
                onNavigateRoute,
                onOpenEntity,
                onDismissAlert,
                unpinItem,
                togglePin,
            }),
        [
            signedIn,
            lawyerId,
            guardInteraction,
            onNavigateRoute,
            onOpenEntity,
            onDismissAlert,
            unpinItem,
            togglePin,
        ],
    );

    return {
        hubPanel,
        selectHubPanel,
        hubFullyEmpty: status.hubFullyEmpty,
        hubHasItems: status.hubHasItems,
        hubInitialPending: status.hubInitialPending,
        hubBootSettling,
        blockClasses,
        blockStyle,
        containerBorderOn,
        alertsTabCount: alertsLive.alertsTabCount,
        alertsEmptyState: status.alertsEmptyState,
        hasCarouselAlerts: alertsLive.hasCarouselAlerts,
        hasAlerts: alertsLive.hasAlerts,
        hubHorizonCounts: alertsLive.hubHorizonCounts,
        activeFilter: alertsSource.activeFilter,
        setActiveFilter: alertsSource.setActiveFilter,
        carouselAlerts: alertsLive.carouselAlerts,
        sourceById: alertsLive.sourceById,
        radarUrgent: alertsLive.radarUrgent,
        pinsAggregatorInput,
        pinsTabCount: pinsBadgeCount,
        cardLayout: status.cardLayout,
        guardedDismissAlert,
        guardedOpenEntity,
        guardedNavigateRoute,
        guardedDismissRadar,
        guardedUnpin,
        guardedTogglePin,
        isPinned,
    };
}
