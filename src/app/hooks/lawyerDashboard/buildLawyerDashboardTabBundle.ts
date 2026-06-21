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
import { prefetchArchivePortal, prefetchGlobalSearchOverlay, prefetchHamiSettings, prefetchRoyalLawyerProfile, prefetchSmartLegalRadar } from '@/app/utils/lazyComponents';
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
    isNewCaseModalOpen: boolean;
    isNotepadOpen: boolean;
    showCommunity: boolean;
    showLawsuitsWorkspace: boolean;
    showUrgentDashboard: boolean;
    showDocs: boolean;
    showContractGenerator: boolean;
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
    openSettings: () => void;
    openGlobalSearch: () => void;
    openNotifications: () => void;
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
    openTransactionsHub: (entityId?: string) => void;
    openFieldTasksSheet: () => void;
    setNotepadMode: (mode: 'list' | 'edit') => void;
    setNotepadFocusNoteId: (id: string | undefined) => void;
    setIsNotepadOpen: (open: boolean) => void;
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
    setUrgentFocusCaseId: (id: string | undefined) => void;
    setShowUrgentDashboard: (open: boolean) => void;
    setTransactionsFocusId: (id: string | undefined) => void;
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
        params.showUrgentDashboard ||
        params.showDocs ||
        params.showContractGenerator ||
        params.showGlobalSearch ||
        params.showNotifications;

    return {
        shouldHideHeader,
        headerProps: {
            shouldShow: !shouldHideHeader && params.activeTab === 'home' && !params.isCriminalDossierOpen,
            unreadCount: params.notificationsUnreadCount,
            onProfileClick: () => params.openProfileTab(),
            onProfilePointerEnter: () => prefetchRoyalLawyerProfile(),
            onSearchClick: () => params.openGlobalSearch(),
            onSearchPointerEnter: () => prefetchGlobalSearchOverlay(),
            onNotificationsClick: params.openNotifications,
            onSettingsClick: () => params.openSettings(),
            onSettingsPointerEnter: () => prefetchHamiSettings(),
        },
        homeTabProps: {
            visible: params.activeTab === 'home',
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
                if (id === 'transaction') {
                    params.openTransactionsHub();
                } else if (id === 'lawsuit') {
                    params.setLawsuitsDossierSection('all');
                    params.setLawsuitsWorkspaceTab('civil');
                    params.setShowLawsuitsWorkspace(true);
                } else if (id === 'execution') {
                    prefetchArchivePortal();
                    params.setArchiveType('execution');
                }
            },
            userId: params.user?.id || '',
            shellAuthUserId: resolveShellAuthUserId(params.authUserId, params.user?.id),
            onOpenCalendar: () => {
                prefetchSmartLegalRadar();
                params.setActiveTab('schedule');
            },
            onOpenFieldTasksSheet: params.openFieldTasksSheet,
            pendingFieldTasksCount: params.pendingFieldTasksCount,
            onOpenFullNotepad: () => {
                params.setNotepadMode('list');
                params.setNotepadFocusNoteId(undefined);
                params.setIsNotepadOpen(true);
            },
            onAddNote: (note) => {
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
                void params.handleSaveNote({
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
            },
        },
        scheduleTabProps: {
            visible: params.activeTab === 'schedule',
            userId: params.user?.id,
            authUserId: params.authUserId,
            calendarSearchFocus: params.calendarSearchFocus,
            onClearCalendarSearchFocus: params.onClearCalendarSearchFocus,
            onBackToHome: () => params.setActiveTab('home'),
            files: params.files,
            executionFiles: params.executionFiles,
            onOpenLawsuitFile: (f) => params.setActiveFile(f),
            onOpenExecutionFile: (ex) => params.setActiveFile(coerceExecutionFilePreserveId(ex)),
            onOpenCriminalCase: params.openCriminalCase,
            onOpenUrgentCase: (caseId) => {
                params.setUrgentFocusCaseId(caseId);
                params.setShowUrgentDashboard(true);
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
                params.setNotepadMode('list');
                params.setNotepadFocusNoteId(noteId);
                params.setIsNotepadOpen(true);
            },
            onOpenFieldTasks: params.openFieldTasksSheet,
        },
    };
}
