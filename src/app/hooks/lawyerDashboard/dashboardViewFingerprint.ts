import type { Orchestration } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint.types';

/** تغيّرات الحذف الناعم/الأرشفة لا تغيّر طول القائمة — يجب تضمينها في البصمة */
function executionFilesLifecycleFingerprint(
    files: Orchestration['workspace']['executionFiles'],
): string {
    if (!files.length) return '';
    return files
        .map(
            (f) =>
                `${String(f.id ?? '')}:${f.executionTrashDeletedAt ?? ''}:${f.executionArchivedAt ?? ''}`,
        )
        .join('|');
}

/** بصمة خفيفة — إعادة تجميع الواجهة فقط عند تغيّرات ذات معنى (بلا فتح overlays الهيدر) */
export function dashboardShellFingerprint(o: Orchestration): string {
    const { overlays, workspace, appAlerts, notifications, archiveAndSync, clusterScanSources } = o;
    const onHome = overlays.activeTab === 'home';
    const alertIds = onHome ? appAlerts.visibleAppAlerts.map((a) => a.id).join(',') : '';
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
        notifications.notificationsUnreadCount,
        o.pendingFieldTasksCount,
        o.theme.primary,
        o.shapeClass,
        o.appLock.locked ? '1' : '0',
        calendarFocus,
        communityLink,
        clusterSig,
    ].join('|');
}

/** فتح إعدادات / إشعارات / بحث — patch خفيف بدل إعادة تجميع كاملة */
export function dashboardHeaderOverlayFingerprint(o: Orchestration): string {
    const showSettings = o.dashboardSettings?.showSettings ?? o.overlays.showSettings ?? false;
    return [
        showSettings ? '1' : '0',
        o.overlays.showGlobalSearch ? '1' : '0',
        o.notifications.showNotifications ? '1' : '0',
    ].join('|');
}

/** @deprecated للاختبارات — shell + overlay */
export function dashboardViewFingerprint(o: Orchestration): string {
    return `${dashboardShellFingerprint(o)}|${dashboardHeaderOverlayFingerprint(o)}`;
}
