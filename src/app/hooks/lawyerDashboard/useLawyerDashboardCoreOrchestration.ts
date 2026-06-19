import { useMemo } from 'react';
import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';
import { useLawyerDashboardAppAlerts } from '@/app/hooks/useLawyerDashboardAppAlerts';
import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';
import { useLawyerDashboardRuntimeEffects } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects';
import { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';
import { useLawyerDashboardNotifications } from '@/app/hooks/lawyerDashboard/useLawyerDashboardNotifications';
import { useLawyerDashboardCalendarCluster } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarCluster';
import { useLawyerDashboardAuxiliaryState } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuxiliaryState';
import { useLawyerDashboardArchiveAndSyncRefs } from '@/app/hooks/lawyerDashboard/useLawyerDashboardArchiveAndSyncRefs';
import { useAuth } from '@/app/context/AuthContext';
import { useCaseStore } from '@/app/stores/caseStore';
import { useThemeStyles } from '@/app/components/lawyer/LawyerShared';
import { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { countPendingFieldTasks } from '@/app/utils/quantumTasksStorage';
import { useAppLock } from '@/app/hooks/useAppLock';
import type { UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export function useLawyerDashboardCoreOrchestration({
    onNavigateToCase,
    quantum,
}: Pick<UseLawyerDashboardCoreParams, 'onNavigateToCase' | 'quantum'>) {
    const criminalBridge = useCriminalDashboardBridge();
    const { settings, currentTheme, pushAllowed } = useLawyerSettings();
    const appLock = useAppLock(settings.security);
    const localAutoSave = settings.data.autoSave;
    const syncNotesOn = settings.data.cloudSync && settings.data.syncNotes;
    const syncFilesOn = settings.data.cloudSync && settings.data.syncFiles;
    const syncExecutionOn = settings.data.cloudSync && settings.data.syncExecution;

    const { user: authUser } = useAuth();
    const { user, authGate } = useLawyerDashboardAuth({
        authUser,
        weeklyBackupReminder: settings.data.weeklyBackupReminder,
    });

    const notifications = useLawyerDashboardNotifications();
    const { urgent, client } = useLawyerDashboardAuxiliaryState();
    const appAlerts = useLawyerDashboardAppAlerts(user?.id);
    const archiveAndSync = useLawyerDashboardArchiveAndSyncRefs();

    const overlays = useLawyerDashboardOverlays({ setArchiveType: archiveAndSync.setArchiveType });
    const { theme, shapeClass } = useThemeStyles(currentTheme, settings.appearance.shape);

    const addCase = useCaseStore((s) => s.addCase);
    const selectCase = useCaseStore((s) => s.selectCase);
    const storeCases = useCaseStore((s) => s.cases);
    const { pendingTasks: quantumPendingForField, tasks: quantumTasks } = quantum;

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
        bumpSearchIndex: () => overlays.setSearchIndexVersion((v) => v + 1),
        selectCase,
    });

    const navigation = useLawyerDashboardNavigation({
        files: workspace.files,
        executionFiles: workspace.executionFiles,
        quantumTasks,
        setActiveTab: overlays.setActiveTab,
        setShowCommunity: overlays.setShowCommunity,
        setCommunityDeepLink: overlays.setCommunityDeepLink,
        setArchiveType: archiveAndSync.setArchiveType,
        setActiveFile: workspace.setActiveFile,
        setShowNotifications: notifications.setShowNotifications,
        setNotepadMode: workspace.setNotepadMode,
        setNotepadFocusNoteId: workspace.setNotepadFocusNoteId,
        setIsNotepadOpen: workspace.setIsNotepadOpen,
        setTransactionsFocusId: overlays.setTransactionsFocusId,
        setUrgentFocusCaseId: urgent.setUrgentFocusCaseId,
        setShowUrgentDashboard: urgent.setShowUrgentDashboard,
        openVaultModal: overlays.openVaultModal,
        openTransactionsHub: overlays.openTransactionsHub,
        openCommunityTab: overlays.openCommunityTab,
        openFieldTasksSheet: overlays.openFieldTasksSheet,
        openCriminalCase: overlays.openCriminalCase,
        openTasksManager: overlays.openTasksManager,
    });

    const criminalCasesForCluster = criminalBridge.ready ? criminalBridge.criminalCases : [];
    const { calendarUserId, clusterScanSources } = useLawyerDashboardCalendarCluster({
        userId: user?.id,
        authUserId: authUser?.id,
        files: workspace.files,
        executionFiles: workspace.executionFiles,
        globalNotes: workspace.globalNotes,
        quantumTasks,
        criminalCasesForCluster,
    });

    const globalSearchNav = useLawyerDashboardGlobalSearchNav({
        files: workspace.files,
        executionFiles: workspace.executionFiles,
        setShowGlobalSearch: overlays.setShowGlobalSearch,
        setGlobalSearchInitialQuery: overlays.setGlobalSearchInitialQuery,
        setShowNotifications: notifications.setShowNotifications,
        setCalendarSearchFocus: overlays.setCalendarSearchFocus,
        setActiveTab: overlays.setActiveTab,
        openCommunityTab: overlays.openCommunityTab,
        setCommunityDeepLink: overlays.setCommunityDeepLink,
        setUrgentFocusCaseId: urgent.setUrgentFocusCaseId,
        setShowUrgentDashboard: urgent.setShowUrgentDashboard,
        openCriminalCase: overlays.openCriminalCase,
        openTransactionsHub: overlays.openTransactionsHub,
        openTasksManager: overlays.openTasksManager,
        setNotepadMode: workspace.setNotepadMode,
        setNotepadFocusNoteId: workspace.setNotepadFocusNoteId,
        setIsNotepadOpen: workspace.setIsNotepadOpen,
        openVaultModal: overlays.openVaultModal,
        setActiveFile: workspace.setActiveFile,
        selectCase,
        onNavigateToCase,
    });

    useLawyerDashboardRuntimeEffects({
        user,
        authUser,
        files: workspace.files,
        executionFiles: workspace.executionFiles,
        globalNotes: workspace.globalNotes,
        searchNotifications: notifications.searchNotifications,
        criminalCasesForCluster,
        searchIndexVersion: overlays.searchIndexVersion,
        showLawsuitsWorkspace: overlays.showLawsuitsWorkspace,
        storeCases,
        addCase,
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

    const pendingFieldTasksCount = useMemo(
        () => countPendingFieldTasks(quantumPendingForField),
        [quantumPendingForField],
    );

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
        notifications,
        urgent,
        client,
        appAlerts,
        archiveAndSync,
        overlays,
        workspace,
        navigation,
        calendarUserId,
        clusterScanSources,
        criminalCasesForCluster,
        criminalBridge,
        globalSearchNav,
        quantumPendingForField,
        pendingFieldTasksCount,
    };
}
