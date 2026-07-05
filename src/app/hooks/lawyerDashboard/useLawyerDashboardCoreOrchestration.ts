import { useCallback, useMemo, useRef } from 'react';
import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';
import { useLawyerDashboardAppAlerts } from '@/app/hooks/useLawyerDashboardAppAlerts';
import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';
import { useLawyerDashboardRuntimeEffects } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects';
import { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';
import { useLawyerDashboardNotifications } from '@/app/hooks/lawyerDashboard/useLawyerDashboardNotifications';
import { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';
import { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import { useLawyerDashboardCalendarCluster } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarCluster';
import { useLawyerDashboardArchiveAndSyncRefs } from '@/app/hooks/lawyerDashboard/useLawyerDashboardArchiveAndSyncRefs';
import { useAuthSafe } from '@/app/context/AuthContext';
import { useCaseStore } from '@/app/stores/caseStore';
import { useThemeStyles } from '@/app/components/lawyer/LawyerShared';
import { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsData,
    useLawyerSettingsFromSlices,
    useLawyerSettingsPushAllowed,
    useLawyerSettingsSecurity,
} from '@/app/context/LawyerSettingsContext';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { useAppLock } from '@/app/hooks/useAppLock';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import { closeOverlaysBeforeNotificationsOpen } from '@/app/services/notifications/notificationShellOrchestration';
import { closeOverlaysBeforeForumOpen } from '@/app/services/forum/forumShellOrchestration';
import { closeOverlaysBeforeTransactionsOpen } from '@/app/services/transactions/transactionsShellOrchestration';
import { closeOverlaysBeforeSettingsOpen } from '@/app/services/settings/settingsShellOrchestration';
import { closeOverlaysBeforeGlobalSearchOpen } from '@/app/services/search/globalSearchShellOrchestration';
import { closeOverlaysBeforeProfileOpen } from '@/app/services/profile/profileShellOrchestration';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile as DashboardExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export function useLawyerDashboardCoreOrchestration({
    onNavigateToCase,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
}: Pick<UseLawyerDashboardCoreParams, 'onNavigateToCase' | 'pendingFieldTasksCount' | 'quantumTasksFingerprint'>) {
    const criminalBridge = useCriminalDashboardBridge();
    const appearance = useLawyerSettingsAppearance();
    const dataSettings = useLawyerSettingsData();
    const securitySettings = useLawyerSettingsSecurity();
    const settings = useLawyerSettingsFromSlices();
    const currentTheme = appearance.theme;
    const pushAllowed = useLawyerSettingsPushAllowed();
    const appLock = useAppLock(securitySettings);
    const localAutoSave = dataSettings.autoSave;
    const cloudSyncReady =
        dataSettings.cloudSync && !securitySettings.localOnlyMode;
    const syncNotesOn = cloudSyncReady;
    const syncFilesOn = cloudSyncReady;
    const syncExecutionOn = cloudSyncReady;

    const { user: authUser } = useAuthSafe();
    const { user, authGate } = useLawyerDashboardAuth({
        authUser,
        weeklyBackupReminder: dataSettings.weeklyBackupReminder,
    });

    const shellAuthUserId = resolveShellAuthUserId(authUser?.id, user?.id);

    const notifications = useLawyerDashboardNotifications(shellAuthUserId);
    const appAlerts = useLawyerDashboardAppAlerts(user?.id);
    const archiveAndSync = useLawyerDashboardArchiveAndSyncRefs();

    const closeCommunityRef = useRef<() => void>(() => undefined);

    const overlays = useLawyerDashboardOverlays({
        setArchiveType: archiveAndSync.setArchiveType,
    });
    const dashboardCommunity = useLawyerDashboardCommunity({
        userId: shellAuthUserId,
        activeTab: overlays.activeTab,
    });
    closeCommunityRef.current = dashboardCommunity.closeCommunity;

    const dashboardHome = useLawyerDashboardHomeTab({
        activeTab: overlays.activeTab,
        setActiveTab: overlays.setActiveTab,
    });

    const profileTab = useLawyerDashboardProfileTab({
        userId: shellAuthUserId,
        activeTab: overlays.activeTab,
        setActiveTab: overlays.setActiveTab,
        setShowCommunity: dashboardCommunity.setShowCommunity,
    });
    const dashboardSettings = useLawyerDashboardSettings(shellAuthUserId);

    const dashboardTransactions = useLawyerDashboardTransactions({
        userId: shellAuthUserId,
        setArchiveType: archiveAndSync.setArchiveType,
        setShowLawsuitsWorkspace: overlays.setShowLawsuitsWorkspace,
    });

    const dashboardGlobalSearch = useLawyerDashboardGlobalSearch({
        userId: shellAuthUserId,
    });

    const dashboardRepository = useLawyerDashboardRepository({ userId: shellAuthUserId });
    const dashboardFieldTasks = useLawyerDashboardFieldTasks({
        userId: shellAuthUserId,
        setActiveTab: overlays.setActiveTab,
        closeCommunity: () => closeCommunityRef.current(),
    });
    const dashboardSchedule = useLawyerDashboardScheduleTab({
        userId: shellAuthUserId,
        activeTab: overlays.activeTab,
        setActiveTab: overlays.setActiveTab,
    });
    const { theme, shapeClass } = useThemeStyles(currentTheme, appearance.shape);

    const productivityOverlayClosers = useMemo(
        () => ({
            closeGlobalSearch: () => dashboardGlobalSearch.closeGlobalSearch(),
            closeSettings: () => dashboardSettings.closeSettings(),
            closeVault: () => dashboardRepository.closeRepository(),
            closeNotepad: () => dashboardRepository.closeRepository(),
            closeTransactionsHub: () => dashboardTransactions.closeTransactionsHub(),
            closeNotifications: () => notifications.closeNotifications(),
            closeCommunity: () => dashboardCommunity.closeCommunity(),
        }),
        [
            dashboardCommunity,
            dashboardGlobalSearch,
            dashboardRepository,
            dashboardSettings,
            dashboardTransactions,
            notifications,
        ],
    );

    const openNotificationsInnerRef = useRef(notifications.openNotifications);
    openNotificationsInnerRef.current = notifications.openNotifications;

    const openNotifications = useCallback(() => {
        closeOverlaysBeforeNotificationsOpen(productivityOverlayClosers);
        openNotificationsInnerRef.current();
    }, [productivityOverlayClosers]);

    const openCommunityTabInnerRef = useRef(dashboardCommunity.openCommunityTab);
    openCommunityTabInnerRef.current = dashboardCommunity.openCommunityTab;

    const openCommunityTab = useCallback(() => {
        closeOverlaysBeforeForumOpen(productivityOverlayClosers);
        openCommunityTabInnerRef.current();
    }, [productivityOverlayClosers]);

    const openTransactionsHubInnerRef = useRef(dashboardTransactions.openTransactionsHub);
    openTransactionsHubInnerRef.current = dashboardTransactions.openTransactionsHub;

    const openTransactionsHub = useCallback((focusId?: string) => {
        closeOverlaysBeforeTransactionsOpen(productivityOverlayClosers);
        openTransactionsHubInnerRef.current(focusId);
    }, [productivityOverlayClosers]);

    const openSettingsInnerRef = useRef(dashboardSettings.openSettings);
    openSettingsInnerRef.current = dashboardSettings.openSettings;

    const openSettings = useCallback(() => {
        closeOverlaysBeforeSettingsOpen(productivityOverlayClosers);
        overlays.setActiveTab('home');
        openSettingsInnerRef.current();
    }, [overlays, productivityOverlayClosers]);

    const hydrateCasesFromLawsuitFiles = useCaseStore((s) => s.hydrateCasesFromLawsuitFiles);
    const selectCase = useCaseStore((s) => s.selectCase);
    const storeCases = useCaseStore((s) => s.cases);
    const quantumPendingForField = useMemo(
        () => getQuantumPendingSnapshot(),
        [quantumTasksFingerprint],
    );
    const quantumTasks = quantumPendingForField;

    const workspace = useLawyerDashboardWorkspace({
        localAutoSave,
        user,
        authUserId: authUser?.id,
        refreshAppAlerts: appAlerts.refreshAppAlerts,
        showLawsuitsWorkspace: overlays.showLawsuitsWorkspace,
        archiveType: archiveAndSync.archiveType,
        setArchiveType: archiveAndSync.setArchiveType,
        criminalBridge,
        onOpenCriminalDashboard: overlays.openCriminalCase,
        bumpSearchIndex: dashboardGlobalSearch.bumpSearchIndex,
        selectCase,
        closeNotepad: dashboardRepository.closeRepository,
    });

    const dashboardExecutionFiles = useMemo<DashboardExecutionFile[]>(
        () => workspace.executionFiles.map((file) => coerceExecutionFilePreserveId(file)),
        [workspace.executionFiles],
    );

    const navigation = useLawyerDashboardNavigation({
        files: workspace.files,
        executionFiles: dashboardExecutionFiles,
        setActiveTab: overlays.setActiveTab,
        setShowCommunity: dashboardCommunity.setShowCommunity,
        setCommunityDeepLink: dashboardCommunity.setCommunityDeepLink,
        setArchiveType: archiveAndSync.setArchiveType,
        setActiveFile: workspace.setActiveFile,
        setShowNotifications: notifications.closeNotifications,
        openNotepad: dashboardRepository.openNotepad,
        setTransactionsFocusId: dashboardTransactions.setTransactionsFocusId,
        openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
        openVaultModal: dashboardRepository.openVaultModal,
        openTransactionsHub: openTransactionsHub,
        openCommunityTab,
        openFieldTasksSheet: dashboardFieldTasks.openFieldTasksSheet,
        openCriminalCase: overlays.openCriminalCase,
        openTasksManager: dashboardFieldTasks.openTasksManager,
        openScheduleTab: dashboardSchedule.openScheduleTab,
    });

    const criminalCasesForCluster = criminalBridge.ready ? criminalBridge.criminalCases : [];
    const { calendarUserId, clusterScanSources } = useLawyerDashboardCalendarCluster({
        userId: user?.id,
        authUserId: authUser?.id,
        files: workspace.files,
        executionFiles: dashboardExecutionFiles,
        globalNotes: workspace.globalNotes,
        quantumTasks,
        criminalCasesForCluster,
    });

    const pendingFieldTasksCountResolved = pendingFieldTasksCount;

    const openGlobalSearchInnerRef = useRef(dashboardGlobalSearch.openGlobalSearch);
    openGlobalSearchInnerRef.current = dashboardGlobalSearch.openGlobalSearch;

    const openGlobalSearch = useCallback(
        (seed = '') => {
            closeOverlaysBeforeGlobalSearchOpen(productivityOverlayClosers);
            const querySeed = typeof seed === 'string' ? seed : '';
            openGlobalSearchInnerRef.current(querySeed);
        },
        [productivityOverlayClosers],
    );

    const openProfileTabInnerRef = useRef(profileTab.openProfileTab);
    openProfileTabInnerRef.current = profileTab.openProfileTab;

    const openProfileTab = useCallback(() => {
        closeOverlaysBeforeProfileOpen(productivityOverlayClosers);
        openProfileTabInnerRef.current();
    }, [productivityOverlayClosers]);

    const globalSearchNav = useLawyerDashboardGlobalSearchNav({
        files: workspace.files,
        executionFiles: dashboardExecutionFiles,
        setShowGlobalSearch: dashboardGlobalSearch.setShowGlobalSearch,
        setGlobalSearchInitialQuery: dashboardGlobalSearch.setGlobalSearchInitialQuery,
        openNotifications,
        openProfileTab,
        openScheduleTab: dashboardSchedule.openScheduleTab,
        setActiveTab: overlays.setActiveTab,
        openCommunityTab,
        setCommunityDeepLink: dashboardCommunity.setCommunityDeepLink,
        openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
        openCriminalCase: overlays.openCriminalCase,
        openTransactionsHub: openTransactionsHub,
        openTasksManager: dashboardFieldTasks.openTasksManager,
        openNotepad: dashboardRepository.openNotepad,
        openVaultModal: dashboardRepository.openVaultModal,
        setActiveFile: workspace.setActiveFile,
        selectCase,
        onNavigateToCase,
    });

    useLawyerDashboardRuntimeEffects({
        user,
        authUser,
        files: workspace.files,
        executionFiles: dashboardExecutionFiles,
        globalNotes: workspace.globalNotes,
        searchNotifications: notifications.searchNotifications,
        criminalCasesForCluster,
        quantumTasks,
        searchIndexVersion: dashboardGlobalSearch.searchIndexVersion,
        showLawsuitsWorkspace: overlays.showLawsuitsWorkspace,
        lawsuitsDossierSection: overlays.lawsuitsDossierSection,
        storeCases,
        hydrateCasesFromLawsuitFiles,
        refreshAppAlerts: appAlerts.refreshAppAlerts,
        reloadLawsuitFiles: workspace.reloadLawsuitFiles,
        reloadExecutionFiles: workspace.reloadExecutionFiles,
        setGlobalNotes: workspace.setGlobalNotes,
        setActiveFile: workspace.setActiveFile,
        setArchiveType: archiveAndSync.setArchiveType,
        setLawsuitsDossierSection: overlays.setLawsuitsDossierSection,
        setLawsuitsWorkspaceTab: overlays.setLawsuitsWorkspaceTab,
        setShowLawsuitsWorkspace: overlays.setShowLawsuitsWorkspace,
    });

    const closeHubShellOverlays = useCallback(() => {
        overlays.closeHubShellOverlays();
        dashboardTransactions.closeTransactionsHub();
        dashboardRepository.closeRepository();
        dashboardGlobalSearch.closeGlobalSearch();
    }, [dashboardGlobalSearch, dashboardRepository, dashboardTransactions, overlays]);

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
        dashboardSettings: { ...dashboardSettings, openSettings },
        dashboardTransactions: { ...dashboardTransactions, openTransactionsHub },
        dashboardRepository,
        dashboardGlobalSearch,
        dashboardFieldTasks,
        dashboardSchedule,
        dashboardCommunity: { ...dashboardCommunity, openCommunityTab },
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
        },
        workspace,
        navigation,
        calendarUserId,
        clusterScanSources,
        criminalCasesForCluster,
        criminalBridge,
        globalSearchNav,
        quantumPendingForField,
        pendingFieldTasksCount: pendingFieldTasksCountResolved,
    };
}
