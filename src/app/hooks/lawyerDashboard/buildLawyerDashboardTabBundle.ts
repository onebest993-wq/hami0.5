// @ts-nocheck
import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { CalendarBridge, resolveCalendarUserId } from '@/app/services/calendarBridge';
import { quickNoteTitle } from '@/app/components/lawyer/dashboard/quickNoteUtils';
import { voiceNoteTitleFromMeta } from '@/app/services/voice/voiceNoteCodec';
import { createLawyerDashboardHeaderPrefetch } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch';
import { computeLawyerDashboardHeaderShouldShow } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility';
import { warmExecutionWorkspace, warmLawsuitWorkspace } from '@/app/utils/lazyComponents';
import {
    loadExecutionArchiveHubModule,
    loadLawsuitArchiveHubModule,
} from '@/app/runtime/hubArchiveLoader';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';

export type LawyerDashboardTabBundleParams = {
    user: { id?: string };
    authUserId?: string;
    calendarUserId: string;
    clusterScanSources: ClusterScanSources;
    calendarSearchFocus: { date?: string; eventId?: string } | null;
    onClearCalendarSearchFocus: () => void;
    activeTab: LawyerDashboardTab;
    activeFile: FileData | null;
    archiveType: LawyerArchiveOverlay;
    isCriminalDossierOpen: boolean;
    showSettings: boolean;
    homeLayoutEditMode: boolean;
    enterHomeLayoutEdit: () => void;
    exitHomeLayoutEdit: () => void;
    homeTabSessionKey: number;
    homeHubCardSessionKey: number;
    homeDockChromeSessionKey: number;
    isNewCaseModalOpen: boolean;
    isNotepadOpen: boolean;
    showCommunity: boolean;
    showLawsuitsWorkspace: boolean;
    lawsuitsWorkspaceTab: 'civil' | 'urgent';
    showTransactions: boolean;
    showTasksManager: boolean;
    fieldTasksSheetOpen: boolean;
    showDocs: boolean;
    showGlobalSearch: boolean;
    showNotifications: boolean;
    notificationsUnreadCount: number;
    pendingFieldTasksCount: number;
    visibleAppAlerts: SecretaryAlert[];
    appAlertsLoading: boolean;
    appAlertsError: string | null;
    theme: ComponentProps<typeof LawyerDashboardHomeTab>['theme'];
    shapeClass: string;
    files: ComponentProps<typeof LawyerDashboardScheduleTab>['files'];
    executionFiles: ComponentProps<typeof LawyerDashboardScheduleTab>['executionFiles'];
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    openProfileTab: () => void;
    primeProfileTabMount: () => void;
    openSettings: () => void;
    primeSettingsShellMount: () => void;
    openGlobalSearch: () => void;
    primeGlobalSearchShellMount: () => void;
    openNotifications: () => void;
    primeNotificationPanelMount: () => void;
    navigateWorkspaceRoute: ReturnType<typeof useLawyerDashboardNavigation>['navigateWorkspaceRoute'];
    openSecretaryAlert: ReturnType<typeof useLawyerDashboardNavigation>['openSecretaryAlert'];
    dismissAppAlert: (alertId: string) => void;
    handleAlertResolved: (alert: SecretaryAlert) => void;
    setArchiveType: (type: LawyerArchiveOverlay) => void;
    openNormalNewCaseModal: () => void;
    openCommunityTab: () => void;
    setLawsuitsDossierSection: (section: 'all' | 'civil' | 'personal' | 'criminal') => void;
    setLawsuitsWorkspaceTab: (tab: 'civil' | 'urgent') => void;
    setShowLawsuitsWorkspace: (open: boolean) => void;
    closeTransactionsHub: () => void;
    openTransactionsHub: (entityId?: string) => void;
    primeTransactionsHubMount: () => void;
    openFieldTasksSheet: () => void;
    openScheduleTab: (opts?: { date?: string; eventId?: string }) => void;
    primeScheduleTabMount: () => void;
    scheduleTabSessionKey: number;
    backToHomeFromSchedule: () => void;
    primeFieldTasksShellMount: () => void;
    openVaultModal: () => void;
    primeVaultShellMount: () => void;
    openNotepad: (opts?: { mode?: 'list' | 'create'; focusNoteId?: string }) => void;
    openRepository: (opts?: OpenRepositoryOptions) => void;
    closeNotepad: () => void;
    primeNotepadShellMount: () => void;
    handleSaveNote: (note: {
        id: number;
        title: string;
        body: string;
        isPinned: boolean;
        date: string;
        type: string;
    }) => void | Promise<void>;
    setActiveFile: (file: FileData | null) => void;
    openCriminalCase: (caseId: string) => void;
    openUrgentInLawsuitsWorkspace: (caseId?: string) => void;
    setTransactionsFocusId: (id: string | undefined) => void;
    closeHubShellOverlays: () => void;
};

export function buildLawyerDashboardTabBundle(
    params: LawyerDashboardTabBundleParams,
): {
    shouldHideHeader: boolean;
    headerProps: ComponentProps<typeof Header>;
    homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
    scheduleTabProps: ComponentProps<typeof LawyerDashboardScheduleTab>;
} {
    const shouldHideHeader =
        params.showSettings ||
        params.isNewCaseModalOpen ||
        params.isNotepadOpen ||
        params.showCommunity ||
        params.activeTab !== 'home' ||
        Boolean(params.activeFile) ||
        Boolean(params.archiveType) ||
        params.showLawsuitsWorkspace ||
        params.showTransactions ||
        params.showTasksManager ||
        params.showDocs;

    const shellUserId = resolveShellAuthUserId(params.authUserId, params.user?.id);
    const headerPrefetch = createLawyerDashboardHeaderPrefetch(shellUserId, {
        primeGlobalSearchShellMount: params.primeGlobalSearchShellMount,
        primeProfileTabMount: params.primeProfileTabMount,
        primeVaultShellMount: params.primeVaultShellMount,
    });

    const headerVisibilityInput = {
        showSettings: params.showSettings,
        isNewCaseModalOpen: params.isNewCaseModalOpen,
        isNotepadOpen: params.isNotepadOpen,
        showCommunity: params.showCommunity,
        activeTab: params.activeTab,
        activeFile: params.activeFile,
        archiveType: params.archiveType,
        showLawsuitsWorkspace: params.showLawsuitsWorkspace,
        showTransactions: params.showTransactions,
        showTasksManager: params.showTasksManager,
        showDocs: params.showDocs,
        isCriminalDossierOpen: params.isCriminalDossierOpen,
    };

    return {
        shouldHideHeader,
        headerProps: {
            shouldShow: computeLawyerDashboardHeaderShouldShow(headerVisibilityInput),
            unreadCount: params.notificationsUnreadCount,
            onProfileClick: params.openProfileTab,
            onProfilePointerEnter: () => {
                headerPrefetch.onProfilePointerEnter();
                params.primeProfileTabMount();
            },
            onProfilePointerDown: () => {
                headerPrefetch.onProfilePointerDown();
                params.primeProfileTabMount();
            },
            onSearchClick: params.openGlobalSearch,
            onSearchPointerEnter: headerPrefetch.onSearchPointerEnter,
            onSearchPointerDown: headerPrefetch.onSearchPointerDown,
            onNotificationsClick: params.openNotifications,
            onNotificationsPointerEnter: () => {
                headerPrefetch.onNotificationsPointerEnter();
                params.primeNotificationPanelMount();
            },
            onNotificationsPointerDown: () => {
                headerPrefetch.onNotificationsPointerDown();
                params.primeNotificationPanelMount();
            },
            onSettingsClick: params.openSettings,
            onSettingsPointerEnter: () => {
                headerPrefetch.onSettingsPointerEnter();
                params.primeSettingsShellMount();
            },
            onSettingsPointerDown: () => {
                headerPrefetch.onSettingsPointerDown();
                params.primeSettingsShellMount();
            },
        },
        homeTabProps: {
            visible: params.activeTab === 'home',
            homeTabSessionKey: params.homeTabSessionKey,
            homeHubCardSessionKey: params.homeHubCardSessionKey,
            homeDockChromeSessionKey: params.homeDockChromeSessionKey,
            homeLayoutEditMode: params.homeLayoutEditMode,
            onExitHomeLayoutEdit: params.exitHomeLayoutEdit,
            calendarUserId: params.calendarUserId,
            clusterScanSources: params.clusterScanSources,
            secretaryAlerts: params.visibleAppAlerts,
            alertsLoading: params.appAlertsLoading,
            alertsError: params.appAlertsError,
            onNavigateRoute: params.navigateWorkspaceRoute,
            onOpenEntity: params.openSecretaryAlert,
            onDismissAlert: params.dismissAppAlert,
            onAlertResolved: params.handleAlertResolved,
            onAcceptedConvertToCase: () => {
                params.setArchiveType('client_requests');
                params.openNormalNewCaseModal();
            },
            onOpenCommunity: params.openCommunityTab,
            theme: params.theme,
            shapeClass: params.shapeClass,
            onOpenArchive: (id) => {
                params.closeNotepad();
                dismissTransientOverlays();
                params.closeTransactionsHub();

                if (id === 'transaction') {
                    dismissTransientOverlays('transactions');
                    params.openTransactionsHub();
                    return;
                }

                if (id === 'lawsuit') {
                    warmLawsuitWorkspace();
                    params.setArchiveType(null);
                    params.setLawsuitsDossierSection('all');
                    params.setLawsuitsWorkspaceTab('civil');
                    params.setShowLawsuitsWorkspace(true);
                    void loadLawsuitArchiveHubModule().catch(() => undefined);
                    return;
                }

                if (id === 'execution') {
                    warmExecutionWorkspace();
                    params.setShowLawsuitsWorkspace(false);
                    params.setArchiveType('execution');
                    void loadExecutionArchiveHubModule().catch(() => undefined);
                }
            },
            userId: params.user?.id || '',
            shellAuthUserId: resolveShellAuthUserId(params.authUserId, params.user?.id),
            onOpenCalendar: () => {
                params.primeScheduleTabMount();
                params.openScheduleTab();
            },
            onOpenFieldTasksSheet: () => {
                params.primeFieldTasksShellMount();
                params.openFieldTasksSheet();
            },
            pendingFieldTasksCount: params.pendingFieldTasksCount,
            onOpenFullNotepad: () => {
                params.primeNotepadShellMount();
                params.openNotepad({ mode: 'list' });
            },
            onOpenRepository: (opts) => {
                params.primeNotepadShellMount();
                params.openRepository(opts);
            },
            onOpenVault: () => {
                params.primeVaultShellMount();
                params.openVaultModal();
            },
            fieldTasksSheetOpen: params.fieldTasksSheetOpen,
            onAddNote: async (note) => {
                const id = note.id;
                if (note.type === 'schedule') {
                    CalendarBridge.syncNoteReminder({
                        userId: resolveCalendarUserId(params.user?.id),
                        noteId: String(id),
                        date: new Date().toISOString(),
                        title: note.content.trim().slice(0, 80) || 'موعد سريع',
                        body: note.content,
                    });
                }
                const title =
                    note.type === 'voice'
                        ? voiceNoteTitleFromMeta({
                              transcript: note.transcript,
                              durationSec: note.durationSeconds,
                              fallback: quickNoteTitle('voice'),
                          })
                        : quickNoteTitle(note.type);
                await params.handleSaveNote({
                    id,
                    title,
                    body: note.content,
                    isPinned: false,
                    date: new Date().toISOString(),
                    type: note.type,
                    ...(note.type === 'voice'
                        ? {
                              transcript: note.transcript,
                              voiceDurationSec: note.durationSeconds,
                          }
                        : {}),
                });
                if (note.type === 'voice') {
                    params.openNotepad({ mode: 'list', focusNoteId: String(id) });
                }
            },
        },
        scheduleTabProps: {
            visible: params.activeTab === 'schedule',
            scheduleTabSessionKey: params.scheduleTabSessionKey,
            userId: params.user?.id,
            authUserId: params.authUserId,
            calendarSearchFocus: params.calendarSearchFocus,
            onClearCalendarSearchFocus: params.onClearCalendarSearchFocus,
            onBackToHome: params.backToHomeFromSchedule,
            files: params.files,
            executionFiles: params.executionFiles,
            onOpenLawsuitFile: (f) => params.setActiveFile(f),
            onOpenExecutionFile: (ex) => params.setActiveFile(coerceExecutionFilePreserveId(ex)),
            onOpenCriminalCase: params.openCriminalCase,
            onOpenUrgentCase: (caseId) => {
                params.openUrgentInLawsuitsWorkspace(caseId);
            },
            onOpenTransaction: (entityId, file) => {
                if (file) {
                    params.setActiveFile(file);
                    return;
                }
                params.setTransactionsFocusId(entityId);
                params.openTransactionsHub(entityId);
            },
            onOpenNote: (noteId) => {
                params.openNotepad({ mode: 'list', focusNoteId: noteId });
            },
            onOpenFieldTasks: params.openFieldTasksSheet,
        },
    };
}
