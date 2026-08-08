import type { ComponentProps, Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { OpenRepositoryOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { coerceExecutionFilePreserveId, isRecord, resolveOpenableFileData } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { quickNoteTitle } from '@/app/components/lawyer/dashboard/quickNoteUtils';
import { voiceNoteTitleFromMeta } from '@/app/services/voice/voiceNoteCodec';
import { createLawyerDashboardHeaderPrefetch } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch';
import { computeLawyerDashboardHeaderShouldShow } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility';
import {
    loadLawsuitArchiveHubModule,
    hydrateArchiveHubForInstantOpen,
} from '@/app/runtime/hubArchiveLoader';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { snapProfileShellClose } from '@/app/services/profile/profileShellSnap';
import { resolveShellAuthUserId, isRealSignedIn } from '@/app/services/auth/shellAuth';
import { openExecutionDossierWithContract } from '@/app/runtime/executionOpenContract';
import { openLawsuitDossierWithContract } from '@/app/runtime/lawsuitOpenContract';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

function warmLawsuitWorkspaceIntent(options?: { includeSecondary?: boolean; secondaryDelayMs?: number }) {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.warmLawsuitWorkspace(options))
        .catch(() => undefined);
}

function warmExecutionWorkspaceIntent(options?: { includeSecondary?: boolean; secondaryDelayMs?: number }) {
    // مسار مباشر — بلا hop عبر lazyComponentsIntent
    void import('@/app/runtime/executionWorkspaceWarm')
        .then((m) => m.warmExecutionWorkspace(options))
        .catch(() => undefined);
}

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
    homeTabSessionKey: number;
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
    closeProfileTab: () => void;
    primeProfileTabMount: () => void;
    profileShellReady: boolean;
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
    /** تسليح keep-alive لمخزن التنفيذ قبل/عند الفتح */
    armExecutionArchiveHost?: () => void;
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

type LawyerDashboardTabBundleResult = {
    shouldHideHeader: boolean;
    headerProps: ComponentProps<typeof Header>;
    homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
    scheduleTabProps: ComponentProps<typeof LawyerDashboardScheduleTab>;
};

let cachedTabBundle:
    | {
          params: LawyerDashboardTabBundleParams;
          result: LawyerDashboardTabBundleResult;
      }
    | null = null;

export function resetBuildLawyerDashboardTabBundleCacheForTests(): void {
    cachedTabBundle = null;
}

export function buildLawyerDashboardTabBundle(
    params: LawyerDashboardTabBundleParams,
): LawyerDashboardTabBundleResult {
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
        profileIsOpen: params.activeTab === 'profile',
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

    const previous = cachedTabBundle;
    const nextResult: LawyerDashboardTabBundleResult = {
        shouldHideHeader,
        headerProps:
            previous && canReuseHeaderProps(previous.params, params)
                ? previous.result.headerProps
                : {
                      shouldShow: computeLawyerDashboardHeaderShouldShow(headerVisibilityInput),
                      unreadCount: params.notificationsUnreadCount,
                      onProfileClick:
                          params.activeTab === 'profile'
                              ? params.closeProfileTab
                              : params.openProfileTab,
                      onProfilePointerEnter: headerPrefetch.onProfilePointerEnter,
                      onProfilePointerDown: headerPrefetch.onProfilePointerDown,
                      profileExpanded: params.activeTab === 'profile',
                      profileShellReady: params.profileShellReady,
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
        homeTabProps:
            previous && canReuseHomeTabProps(previous.params, params)
                ? previous.result.homeTabProps
                : {
            visible: params.activeTab === 'home',
            homeTabSessionKey: params.homeTabSessionKey,
            homeDockChromeSessionKey: params.homeDockChromeSessionKey,
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
                const shellUid = resolveShellAuthUserId(params.authUserId, params.user?.id);
                if (!isRealSignedIn(shellUid)) return;
                params.setArchiveType('client_requests');
                params.openNormalNewCaseModal();
            },
            onOpenCommunity: params.openCommunityTab,
            theme: params.theme,
            shapeClass: params.shapeClass,
            onOpenArchive: (id) => {
                const shellUid = resolveShellAuthUserId(params.authUserId, params.user?.id);
                if (!isRealSignedIn(shellUid)) return;

                params.closeNotepad();
                dismissTransientOverlays();
                params.closeTransactionsHub();

                if (id === 'transaction') {
                    dismissTransientOverlays('transactions');
                    params.openTransactionsHub();
                    return;
                }

                if (id === 'lawsuit') {
                    snapProfileShellClose();
                    // أول فتح: Host غالباً مركَّب مسبقاً بعد interactive؛ warm يعيد prime بعد idle-release
                    warmLawsuitWorkspaceIntent({ includeSecondary: false, secondaryDelayMs: 2_000 });
                    void import('@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost').catch(() => undefined);
                    params.setArchiveType(null);
                    params.setLawsuitsDossierSection('all');
                    params.setLawsuitsWorkspaceTab('civil');
                    params.setShowLawsuitsWorkspace(true);
                    void hydrateArchiveHubForInstantOpen('lawsuit');
                    void loadLawsuitArchiveHubModule().catch(() => undefined);
                    return;
                }

                if (id === 'execution') {
                    params.armExecutionArchiveHost?.();
                    void import('@/app/runtime/executionArchiveOpenSession').then((m) =>
                        m.prefetchExecutionArchiveOpen(),
                    );
                    warmExecutionWorkspaceIntent({ includeSecondary: false, secondaryDelayMs: 1_200 });
                    params.setShowLawsuitsWorkspace(false);
                    params.setArchiveType('execution');
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
                params.openRepository(opts);
            },
            onOpenVault: () => {
                params.openVaultModal();
            },
            fieldTasksSheetOpen: params.fieldTasksSheetOpen,
            showTasksManager: params.showTasksManager,
            onAddNote: async (note) => {
                const id = note.id;
                if (note.type === 'schedule') {
                    void import('@/app/services/calendar/bridge/legacyCalendarBridge').then(({ CalendarBridge }) => {
                        CalendarBridge.syncNoteReminder({
                            userId: resolveCalendarUserId(params.user?.id),
                            noteId: String(id),
                            date: new Date().toISOString(),
                            title: note.content.trim().slice(0, 80) || 'موعد سريع',
                            body: note.content,
                        });
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
        scheduleTabProps:
            previous && canReuseScheduleTabProps(previous.params, params)
                ? previous.result.scheduleTabProps
                : {
            visible: params.activeTab === 'schedule',
            scheduleTabSessionKey: params.scheduleTabSessionKey,
            userId: params.user?.id,
            authUserId: params.authUserId,
            calendarSearchFocus: params.calendarSearchFocus,
            onClearCalendarSearchFocus: params.onClearCalendarSearchFocus,
            onBackToHome: params.backToHomeFromSchedule,
            files: params.files,
            executionFiles: params.executionFiles,
            clusterScanSources: params.clusterScanSources,
            secretaryAlerts: params.visibleAppAlerts,
            onOpenLawsuitFile: (f) => {
                const shellUid = resolveShellAuthUserId(params.authUserId, params.user?.id);
                if (!isRealSignedIn(shellUid)) return;
                const resolved = resolveOpenableFileData(f, params.files);
                if (!resolved) return;
                openLawsuitDossierWithContract(() => params.setActiveFile(resolved));
            },
            onOpenExecutionFile: (ex) => {
                const shellUid = resolveShellAuthUserId(params.authUserId, params.user?.id);
                if (!isRealSignedIn(shellUid)) return;
                const id = isRecord(ex) ? ex.id : undefined;
                const fromPool =
                    id != null
                        ? params.executionFiles.find((row) => String(row.id) === String(id))
                        : undefined;
                if (!fromPool) return;
                openExecutionDossierWithContract(() => {
                    params.setActiveFile(coerceExecutionFilePreserveId(fromPool));
                });
            },
            onOpenCriminalCase: params.openCriminalCase,
            onOpenUrgentCase: (caseId) => {
                params.openUrgentInLawsuitsWorkspace(caseId);
            },
            onOpenTransaction: (entityId, file) => {
                const shellUid = resolveShellAuthUserId(params.authUserId, params.user?.id);
                if (!isRealSignedIn(shellUid)) return;
                if (file) {
                    const resolved = resolveOpenableFileData(file, params.files);
                    if (resolved) {
                        openLawsuitDossierWithContract(() => params.setActiveFile(resolved));
                    }
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

    cachedTabBundle = {
        params,
        result: nextResult,
    };

    return nextResult;
}

function canReuseHeaderProps(
    previous: LawyerDashboardTabBundleParams,
    next: LawyerDashboardTabBundleParams,
): boolean {
    return (
        previous.showSettings === next.showSettings &&
        previous.isNewCaseModalOpen === next.isNewCaseModalOpen &&
        previous.isNotepadOpen === next.isNotepadOpen &&
        previous.showCommunity === next.showCommunity &&
        previous.activeTab === next.activeTab &&
        previous.activeFile === next.activeFile &&
        previous.archiveType === next.archiveType &&
        previous.showLawsuitsWorkspace === next.showLawsuitsWorkspace &&
        previous.showTransactions === next.showTransactions &&
        previous.showTasksManager === next.showTasksManager &&
        previous.showDocs === next.showDocs &&
        previous.isCriminalDossierOpen === next.isCriminalDossierOpen &&
        previous.notificationsUnreadCount === next.notificationsUnreadCount &&
        previous.authUserId === next.authUserId &&
        previous.user?.id === next.user?.id &&
        previous.openProfileTab === next.openProfileTab &&
        previous.closeProfileTab === next.closeProfileTab &&
        previous.primeProfileTabMount === next.primeProfileTabMount &&
        previous.profileShellReady === next.profileShellReady &&
        previous.openGlobalSearch === next.openGlobalSearch &&
        previous.primeGlobalSearchShellMount === next.primeGlobalSearchShellMount &&
        previous.openNotifications === next.openNotifications &&
        previous.primeNotificationPanelMount === next.primeNotificationPanelMount &&
        previous.openSettings === next.openSettings &&
        previous.primeSettingsShellMount === next.primeSettingsShellMount &&
        previous.primeVaultShellMount === next.primeVaultShellMount
    );
}

function isHomeStackTab(tab: LawyerDashboardTab): boolean {
    return tab === 'home' || tab === 'profile';
}

function canReuseHomeTabProps(
    previous: LawyerDashboardTabBundleParams,
    next: LawyerDashboardTabBundleParams,
): boolean {
    return (
        (previous.activeTab === next.activeTab ||
            (isHomeStackTab(previous.activeTab) && isHomeStackTab(next.activeTab))) &&
        previous.homeTabSessionKey === next.homeTabSessionKey &&
        previous.homeDockChromeSessionKey === next.homeDockChromeSessionKey &&
        previous.calendarUserId === next.calendarUserId &&
        previous.clusterScanSources === next.clusterScanSources &&
        previous.visibleAppAlerts === next.visibleAppAlerts &&
        previous.appAlertsLoading === next.appAlertsLoading &&
        previous.appAlertsError === next.appAlertsError &&
        previous.navigateWorkspaceRoute === next.navigateWorkspaceRoute &&
        previous.openSecretaryAlert === next.openSecretaryAlert &&
        previous.dismissAppAlert === next.dismissAppAlert &&
        previous.handleAlertResolved === next.handleAlertResolved &&
        previous.setArchiveType === next.setArchiveType &&
        previous.openNormalNewCaseModal === next.openNormalNewCaseModal &&
        previous.openCommunityTab === next.openCommunityTab &&
        previous.theme === next.theme &&
        previous.shapeClass === next.shapeClass &&
        previous.closeNotepad === next.closeNotepad &&
        previous.closeTransactionsHub === next.closeTransactionsHub &&
        previous.openTransactionsHub === next.openTransactionsHub &&
        previous.setLawsuitsDossierSection === next.setLawsuitsDossierSection &&
        previous.setLawsuitsWorkspaceTab === next.setLawsuitsWorkspaceTab &&
        previous.setShowLawsuitsWorkspace === next.setShowLawsuitsWorkspace &&
        previous.user?.id === next.user?.id &&
        previous.authUserId === next.authUserId &&
        previous.primeScheduleTabMount === next.primeScheduleTabMount &&
        previous.openScheduleTab === next.openScheduleTab &&
        previous.primeFieldTasksShellMount === next.primeFieldTasksShellMount &&
        previous.openFieldTasksSheet === next.openFieldTasksSheet &&
        previous.pendingFieldTasksCount === next.pendingFieldTasksCount &&
        previous.primeNotepadShellMount === next.primeNotepadShellMount &&
        previous.openNotepad === next.openNotepad &&
        previous.openRepository === next.openRepository &&
        previous.primeVaultShellMount === next.primeVaultShellMount &&
        previous.openVaultModal === next.openVaultModal &&
        previous.fieldTasksSheetOpen === next.fieldTasksSheetOpen &&
        previous.showTasksManager === next.showTasksManager &&
        previous.handleSaveNote === next.handleSaveNote
    );
}

function canReuseScheduleTabProps(
    previous: LawyerDashboardTabBundleParams,
    next: LawyerDashboardTabBundleParams,
): boolean {
    return (
        previous.activeTab === next.activeTab &&
        previous.scheduleTabSessionKey === next.scheduleTabSessionKey &&
        previous.user?.id === next.user?.id &&
        previous.authUserId === next.authUserId &&
        previous.calendarSearchFocus === next.calendarSearchFocus &&
        previous.onClearCalendarSearchFocus === next.onClearCalendarSearchFocus &&
        previous.backToHomeFromSchedule === next.backToHomeFromSchedule &&
        previous.files === next.files &&
        previous.executionFiles === next.executionFiles &&
        previous.clusterScanSources === next.clusterScanSources &&
        previous.visibleAppAlerts === next.visibleAppAlerts &&
        previous.setActiveFile === next.setActiveFile &&
        previous.openCriminalCase === next.openCriminalCase &&
        previous.openUrgentInLawsuitsWorkspace === next.openUrgentInLawsuitsWorkspace &&
        previous.setTransactionsFocusId === next.setTransactionsFocusId &&
        previous.openTransactionsHub === next.openTransactionsHub &&
        previous.openNotepad === next.openNotepad &&
        previous.openFieldTasksSheet === next.openFieldTasksSheet
    );
}
