import type { Orchestration } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint.types';
import { loadPersistedWallpaper } from '@/app/services/settings';

/** تغيّرات الحذف الناعم/الأرشفة لا تغيّر طول القائمة — يجب تضمينها في البصمة */
function executionFilesLifecycleFingerprint(
    files: Orchestration['workspace']['executionFiles'],
): string {
    if (!files.length) return '';
    const parts: string[] = [];
    for (let i = 0; i < files.length; i += 1) {
        const f = files[i];
        if (!f.executionTrashDeletedAt && !f.executionArchivedAt) continue;
        parts.push(
            `${String(f.id ?? i)}:${f.executionTrashDeletedAt ?? ''}:${f.executionArchivedAt ?? ''}`,
        );
        if (parts.length >= 64) {
            parts.push(`+${files.length - i - 1}`);
            break;
        }
    }
    return parts.join('|');
}

/** بصمة خفيفة — إعادة تجميع الواجهة فقط عند تغيّرات ذات معنى (بلا فتح overlays الهيدر) */
export function dashboardShellFingerprint(o: Orchestration): string {
    const { overlays, workspace, appAlerts, notifications, archiveAndSync, clusterScanSources } = o;
    const onHome = overlays.activeTab === 'home';
    const alerts = appAlerts.visibleAppAlerts;
    const alertIds = onHome
        ? `${alerts.length}:${alerts[0]?.id ?? ''}:${alerts[alerts.length - 1]?.id ?? ''}`
        : '';
    const alertsError = onHome ? (appAlerts.appAlertsError ?? '') : '';
    const calendarFocus = overlays.calendarSearchFocus
        ? `${overlays.calendarSearchFocus.date ?? ''}|${overlays.calendarSearchFocus.eventId ?? ''}`
        : '';
    const communityLink = overlays.communityDeepLink
        ? `${overlays.communityDeepLink.postId ?? ''}|${overlays.communityDeepLink.openComments ? '1' : '0'}`
        : '';
    const clusterSig =
        onHome && clusterScanSources
            ? `${clusterScanSources.ready ? '1' : '0'}|${clusterScanSources.urgentCases.length}|${clusterScanSources.threadingTransactions.length}`
            : '';

    return [
        o.user?.id ?? '',
        overlays.activeTab,
        overlays.homeLayoutEditMode,
        overlays.showCommunity,
        overlays.showLawsuitsWorkspace,
        overlays.lawsuitsWorkspaceTab,
        overlays.lawsuitsDossierSection,
        overlays.showTransactions,
        overlays.showDocs,
        overlays.fieldTasksSheetOpen ? '1' : '0',
        overlays.showTasksManager ? '1' : '0',
        overlays.tasksManagerFocusTaskId ?? '',
        overlays.transactionsFocusId ?? '',
        overlays.criminalDashboardCaseId ?? '',
        overlays.isCriminalDossierOpen ? '1' : '0',
        archiveAndSync.archiveType ?? '',
        workspace.files.length,
        workspace.executionFiles.length,
        executionFilesLifecycleFingerprint(workspace.executionFiles),
        workspace.globalNotes.length,
        workspace.activeFile?.id ?? '',
        overlays.isNotepadOpen ? '1' : '0',
        workspace.isNewCaseModalOpen ? '1' : '0',
        workspace.isExecutionModalOpen ? '1' : '0',
        alertIds,
        alertsError,
        o.pendingFieldTasksCount,
        o.theme.primary,
        o.shapeClass,
        o.appLock.locked ? '1' : '0',
        calendarFocus,
        communityLink,
        clusterSig,
        o.settings.appearance.theme,
        o.settings.appearance.backgroundPreset ?? 'none',
        o.settings.appearance.wallpaperStamp ?? 0,
        loadPersistedWallpaper() ? '1' : '0',
        o.settings.performance.litePerformance ?? 'auto',
    ].join('|');
}

/** فتح إعدادات / إشعارات / بحث / تبويب — patch خفيف بدل إعادة تجميع كاملة */
export function dashboardHeaderOverlayFingerprint(o: Orchestration): string {
    const showSettings = o.dashboardSettings?.showSettings ?? o.overlays.showSettings ?? false;
    return [
        o.overlays.activeTab,
        showSettings ? '1' : '0',
        o.overlays.showGlobalSearch ? '1' : '0',
        o.notifications.showNotifications ? '1' : '0',
        o.notifications.notificationsUnreadCount,
    ].join('|');
}

/** @deprecated للاختبارات — shell + overlay */
export function dashboardViewFingerprint(o: Orchestration): string {
    return `${dashboardShellFingerprint(o)}|${dashboardHeaderOverlayFingerprint(o)}`;
}
