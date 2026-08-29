import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LawyerDashboardNavigationBag } from '@/app/hooks/useLawyerDashboardNavigation';
import { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';
import { useLawyerDashboardCalendarClusterLite } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarClusterLite';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { useCalendarEventsForClusterScan } from '@/app/workspace/useCalendarEventsForClusterScan';
import { returnToLawyerHomeDashboard } from '@/app/hooks/lawyerDashboard/lawyerDashboardReturnHome';
import { closeOverlaysBeforeGlobalSearchOpen } from '@/app/services/search/globalSearchShellOrchestration';
import { closeOverlaysBeforeProfileOpen } from '@/app/services/profile/profileShellPolicy';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile as DashboardExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { useAfterFirstTabOpen } from '@/app/hooks/lawyerDashboard/useAfterFirstTabOpen';
import type { LawyerDashboardDeferredFeatureSurfacesProps } from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import { createNavigationStubs } from '@/app/components/lawyer/dashboard/createNavigationStubs';
import type { LawyerDashboardNavigationIslandProps } from '@/app/components/lawyer/dashboard/LawyerDashboardNavigationIsland.types';
import type { LawyerDashboardPreDockFeatureSurfacesProps } from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';
import type { LawyerDashboardPreWorkspaceOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration';

const EMPTY_CRIMINAL_CASES_FOR_CLUSTER: unknown[] = [];

function clusterScanSourcesSame(a: ClusterScanSources, b: ClusterScanSources): boolean {
    return (
        a.ready === b.ready &&
        a.lawsuitFiles === b.lawsuitFiles &&
        a.executionFiles === b.executionFiles &&
        a.criminalCases === b.criminalCases &&
        a.urgentCases === b.urgentCases &&
        a.threadingTransactions === b.threadingTransactions &&
        a.threadingTasks === b.threadingTasks &&
        a.notes === b.notes &&
        a.fieldTasks === b.fieldTasks &&
        a.vaultDocs === b.vaultDocs &&
        a.calendarEvents === b.calendarEvents
    );
}

export function useLawyerDashboardCoreOrchestration(
    pre: LawyerDashboardPreWorkspaceOrchestration,
    {
        onNavigateToCase,
        pendingFieldTasksCount,
    }: Pick<UseLawyerDashboardCoreParams, 'onNavigateToCase' | 'pendingFieldTasksCount'>,
) {
    const {
        authGate,
        user,
        authUser,
        settings,
        theme,
        shapeClass,
        pushAllowed,
        syncNotesOn,
        syncFilesOn,
        syncExecutionOn,
        appLock,
        notifications,
        settingsFeature,
        profileFeature,
        appAlerts,
        archiveAndSync,
        overlays,
        communityFeature,
        scheduleFeature,
        repositoryFeature,
        dashboardHome,
        earlyArm,
        forceArm,
        bag,
        onDeferredFeaturesReady,
        openNotifications,
        openCommunityTab,
        openTransactionsHub,
        openSettings,
        selectCase,
        quantumPendingForField,
        quantumTasks,
        criminalBridge,
        backgroundRuntimeEnabled,
        shellAuthUserId,
        preDockEarlyArm,
        preDockForceArm,
        onPreDockFeaturesReady,
    } = pre;

    const workspace = useLawyerDashboardWorkspace();
    const afterFirstTabOpen = useAfterFirstTabOpen();
    const [liveNavigation, setLiveNavigation] = useState<LawyerDashboardNavigationBag | null>(null);
    const navigationStubs = useMemo(() => createNavigationStubs(), []);

    const dashboardExecutionFiles = useMemo<DashboardExecutionFile[]>(
        () =>
            (Array.isArray(workspace.executionFiles) ? workspace.executionFiles : []).map((file) =>
                coerceExecutionFilePreserveId(file),
            ),
        [workspace.executionFiles],
    );

    const navigation = liveNavigation ?? navigationStubs;

    const onNavigationReady = useCallback((next: LawyerDashboardNavigationBag) => {
        setLiveNavigation((prev) => (prev === next ? prev : next));
    }, []);

    const navigationSurfacesProps = useMemo((): LawyerDashboardNavigationIslandProps => {
        return {
            params: {
                userId: shellAuthUserId,
                files: workspace.files,
                executionFiles: dashboardExecutionFiles,
                setActiveTab: overlays.setActiveTab,
                setShowCommunity: communityFeature.setShowCommunity,
                setArchiveType: archiveAndSync.setArchiveType,
                setActiveFile: workspace.setActiveFile,
                setShowNotifications: notifications.closeNotifications,
                openNotepad: repositoryFeature.openNotepad,
                setTransactionsFocusId: bag.transactions.setTransactionsFocusId,
                openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
                openVaultModal: repositoryFeature.openVaultModal,
                openTransactionsHub,
                openCommunityTab,
                openFieldTasksSheet: bag.fieldTasks.openFieldTasksSheet,
                openCriminalCase: overlays.openCriminalCase,
                openTasksManager: bag.fieldTasks.openTasksManager,
                openScheduleTab: scheduleFeature.openScheduleTab,
                openRepository: repositoryFeature.openRepository,
            },
            onReady: onNavigationReady,
        };
    }, [
        archiveAndSync.setArchiveType,
        bag.fieldTasks.openFieldTasksSheet,
        bag.fieldTasks.openTasksManager,
        bag.transactions.setTransactionsFocusId,
        communityFeature.setShowCommunity,
        dashboardExecutionFiles,
        notifications.closeNotifications,
        onNavigationReady,
        openCommunityTab,
        openTransactionsHub,
        overlays.openCriminalCase,
        overlays.openUrgentInLawsuitsWorkspace,
        overlays.setActiveTab,
        repositoryFeature.openNotepad,
        repositoryFeature.openRepository,
        repositoryFeature.openVaultModal,
        scheduleFeature.openScheduleTab,
        shellAuthUserId,
        workspace.files,
        workspace.setActiveFile,
    ]);

    useEffect(() => {
        if (!liveNavigation) return;
        if (import.meta.env.VITE_NATIVE_NOTIFICATION_SHEET !== 'true') return;

        let cancelled = false;
        let cleanup: (() => void) | undefined;

        void import('@/app/runtime/nativeNotificationSheetBridge')
            .then((m) => {
                if (cancelled) return;
                cleanup = m.installNativeNotificationSheetBridge({
                    userId: shellAuthUserId,
                    onNavigate: liveNavigation.handleNotificationRouting,
                });
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, [liveNavigation, shellAuthUserId]);

    const criminalCasesForCluster = criminalBridge.ready
        ? criminalBridge.criminalCases
        : EMPTY_CRIMINAL_CASES_FOR_CLUSTER;
    const vaultDocsForCluster = useVaultDocsForClusterScan(
        resolveCalendarUserId(user?.id ?? authUser?.id ?? null),
        backgroundRuntimeEnabled && afterFirstTabOpen,
    );
    const calendarEventsForCluster = useCalendarEventsForClusterScan(
        resolveCalendarUserId(user?.id ?? authUser?.id ?? null),
        backgroundRuntimeEnabled && afterFirstTabOpen,
    );
    const { calendarUserId, clusterScanSources: liteClusterScanSources } =
        useLawyerDashboardCalendarClusterLite({
            enabled: backgroundRuntimeEnabled,
            userId: user?.id,
            authUserId: authUser?.id,
            files: workspace.files,
            executionFiles: dashboardExecutionFiles,
            globalNotes: workspace.globalNotes,
            quantumTasks,
            criminalCasesForCluster,
            vaultDocs: vaultDocsForCluster,
            calendarEvents: calendarEventsForCluster,
        });
    const [hydratedClusterScanSources, setHydratedClusterScanSources] =
        useState<ClusterScanSources | null>(null);
    const onClusterScanSources = useCallback((sources: ClusterScanSources) => {
        setHydratedClusterScanSources((prev) =>
            prev && clusterScanSourcesSame(prev, sources) ? prev : sources,
        );
    }, []);
    const clusterScanSources = hydratedClusterScanSources ?? liteClusterScanSources;

    const pendingFieldTasksCountResolved = pendingFieldTasksCount;

    const openGlobalSearchInnerRef = useRef(bag.globalSearch.openGlobalSearch);
    openGlobalSearchInnerRef.current = bag.globalSearch.openGlobalSearch;

    const openGlobalSearch = useCallback(
        (seed = '') => {
            const querySeed = typeof seed === 'string' ? seed : '';
            closeOverlaysBeforeGlobalSearchOpen(pre.productivityOverlayClosers);
            openGlobalSearchInnerRef.current(querySeed);
        },
        [pre.productivityOverlayClosers],
    );

    const openProfileTabInnerRef = useRef(profileFeature.openProfileTab);
    openProfileTabInnerRef.current = profileFeature.openProfileTab;

    const openProfileTab = useCallback(() => {
        openProfileTabInnerRef.current();
        queueMicrotask(() => {
            closeOverlaysBeforeProfileOpen(pre.productivityOverlayClosers);
        });
    }, [pre.productivityOverlayClosers]);

    const closeHubShellOverlays = useCallback(() => {
        overlays.closeHubShellOverlays();
        bag.transactions.closeTransactionsHub();
        repositoryFeature.closeRepository();
        bag.globalSearch.closeGlobalSearch();
    }, [bag.globalSearch, bag.transactions, overlays, repositoryFeature]);

    const exitToHomeDashboard = useCallback(() => {
        returnToLawyerHomeDashboard({
            setActiveTab: overlays.setActiveTab,
            closeHubShellOverlays,
            exitCriminalDossierToHome: overlays.exitCriminalDossierToHome,
        });
    }, [closeHubShellOverlays, overlays]);

    const deferredFeatureSurfacesProps = useMemo((): LawyerDashboardDeferredFeatureSurfacesProps => {
        return {
            earlyArm,
            forceArm,
            params: {
                userId: shellAuthUserId,
                activeTab: overlays.activeTab,
                setActiveTab: overlays.setActiveTab,
                setArchiveType: archiveAndSync.setArchiveType,
                setShowLawsuitsWorkspace: overlays.setShowLawsuitsWorkspace,
                files: workspace.files,
                executionFiles: dashboardExecutionFiles,
                criminalCases: criminalCasesForCluster,
                openNotifications,
                openCommunityTab,
                closeCommunity: communityFeature.closeCommunity,
                setCommunityDeepLink: communityFeature.setCommunityDeepLink,
                openTransactionsHub,
                openProfileTab,
                openScheduleTab: scheduleFeature.openScheduleTab,
                openNotepad: repositoryFeature.openNotepad,
                openVaultModal: repositoryFeature.openVaultModal,
                openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
                openCriminalCase: overlays.openCriminalCase,
                setActiveFile: workspace.setActiveFile,
                selectCase,
                onNavigateToCase,
            },
            onReady: onDeferredFeaturesReady,
        };
    }, [
        archiveAndSync.setArchiveType,
        communityFeature.closeCommunity,
        communityFeature.setCommunityDeepLink,
        criminalCasesForCluster,
        dashboardExecutionFiles,
        earlyArm,
        forceArm,
        onDeferredFeaturesReady,
        onNavigateToCase,
        openCommunityTab,
        openNotifications,
        openProfileTab,
        openTransactionsHub,
        scheduleFeature.openScheduleTab,
        repositoryFeature.openNotepad,
        repositoryFeature.openVaultModal,
        overlays.activeTab,
        overlays.openCriminalCase,
        overlays.openUrgentInLawsuitsWorkspace,
        overlays.setActiveTab,
        overlays.setShowLawsuitsWorkspace,
        selectCase,
        shellAuthUserId,
        workspace.files,
        workspace.setActiveFile,
    ]);

    const preDockFeatureSurfacesProps = useMemo((): LawyerDashboardPreDockFeatureSurfacesProps => {
        return {
            earlyArm: preDockEarlyArm,
            forceArm: preDockForceArm,
            params: {
                userId: shellAuthUserId,
                activeTab: overlays.activeTab,
                setActiveTab: overlays.setActiveTab,
            },
            onReady: onPreDockFeaturesReady,
        };
    }, [
        onPreDockFeaturesReady,
        overlays.activeTab,
        overlays.setActiveTab,
        preDockEarlyArm,
        preDockForceArm,
        shellAuthUserId,
    ]);

    const dashboardCommunity = { ...communityFeature, openCommunityTab };
    const dashboardSettings = { ...settingsFeature, openSettings };
    const dashboardTransactions = { ...bag.transactions, openTransactionsHub };
    const dashboardRepository = repositoryFeature;
    const dashboardGlobalSearch = bag.globalSearch;
    const dashboardFieldTasks = bag.fieldTasks;
    const dashboardSchedule = scheduleFeature;
    const profileTab = profileFeature;
    const globalSearchNav = bag.globalSearchNav;

    return {
        authGate,
        user,
        authUser,
        settings,
        theme,
        shapeClass,
        pushAllowed,
        syncNotesOn,
        syncFilesOn,
        syncExecutionOn,
        appLock,
        notifications: { ...notifications, openNotifications },
        profileTab,
        dashboardSettings,
        dashboardTransactions,
        dashboardRepository,
        dashboardGlobalSearch,
        dashboardFieldTasks,
        dashboardSchedule,
        dashboardCommunity,
        dashboardHome,
        appAlerts,
        archiveAndSync,
        overlays: {
            ...overlays,
            ...dashboardSettings,
            ...dashboardTransactions,
            ...dashboardRepository,
            ...dashboardGlobalSearch,
            ...dashboardFieldTasks,
            ...dashboardSchedule,
            ...dashboardCommunity,
            openTransactionsHub,
            openCommunityTab,
            ...dashboardHome,
            openGlobalSearch,
            openSettings,
            openProfileTab,
            closeHubShellOverlays,
            exitToHomeDashboard,
        },
        workspace,
        navigation,
        calendarUserId,
        clusterScanSources,
        onClusterScanSources,
        criminalCasesForCluster,
        criminalBridge,
        globalSearchNav,
        quantumPendingForField,
        pendingFieldTasksCount: pendingFieldTasksCountResolved,
        dashboardExecutionFiles,
        deferredFeatureSurfacesProps,
        preDockFeatureSurfacesProps,
        navigationSurfacesProps,
    };
}
