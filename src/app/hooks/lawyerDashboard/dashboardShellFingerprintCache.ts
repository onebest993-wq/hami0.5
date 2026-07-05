import type { Orchestration } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint.types';
import { dashboardShellFingerprint } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint';

let cachedKey = '';
let cachedFingerprint = '';

/** بصمة shell مع cache — يتجنب إعادة حساب O(n) عند كل render بنفس المدخلات */
export function getCachedDashboardShellFingerprint(o: Orchestration): string {
    const key = buildShellFingerprintCacheKey(o);
    if (key === cachedKey) return cachedFingerprint;
    cachedKey = key;
    cachedFingerprint = dashboardShellFingerprint(o);
    return cachedFingerprint;
}

/** للاختبارات */
export function resetDashboardShellFingerprintCacheForTests(): void {
    cachedKey = '';
    cachedFingerprint = '';
}

function buildShellFingerprintCacheKey(o: Orchestration): string {
    const { overlays, workspace, appAlerts, archiveAndSync, clusterScanSources } = o;
    const onHome = overlays.activeTab === 'home';
    const alerts = appAlerts.visibleAppAlerts;
    const alertSig = onHome
        ? `${alerts.length}:${alerts[0]?.id ?? ''}:${alerts[alerts.length - 1]?.id ?? ''}:${appAlerts.appAlertsError ?? ''}`
        : '';
    const clusterSig =
        onHome && clusterScanSources
            ? `${clusterScanSources.ready ? '1' : '0'}|${clusterScanSources.urgentCases.length}|${clusterScanSources.threadingTransactions.length}`
            : '';

    return [
        o.user?.id ?? '',
        overlays.activeTab,
        overlays.homeLayoutEditMode ? '1' : '0',
        overlays.showCommunity ? '1' : '0',
        overlays.showLawsuitsWorkspace ? '1' : '0',
        overlays.lawsuitsWorkspaceTab,
        overlays.lawsuitsDossierSection,
        overlays.showTransactions ? '1' : '0',
        overlays.showDocs ? '1' : '0',
        overlays.fieldTasksSheetOpen ? '1' : '0',
        overlays.showTasksManager ? '1' : '0',
        overlays.tasksManagerFocusTaskId ?? '',
        overlays.transactionsFocusId ?? '',
        overlays.criminalDashboardCaseId ?? '',
        overlays.isCriminalDossierOpen ? '1' : '0',
        archiveAndSync.archiveType ?? '',
        workspace.files.length,
        workspace.executionFiles.length,
        executionLifecycleCacheKey(workspace.executionFiles),
        workspace.globalNotes.length,
        workspace.activeFile?.id ?? '',
        overlays.isNotepadOpen ? '1' : '0',
        workspace.isNewCaseModalOpen ? '1' : '0',
        workspace.isExecutionModalOpen ? '1' : '0',
        alertSig,
        o.pendingFieldTasksCount,
        o.theme.primary,
        o.shapeClass,
        o.appLock.locked ? '1' : '0',
        overlays.calendarSearchFocus
            ? `${overlays.calendarSearchFocus.date ?? ''}|${overlays.calendarSearchFocus.eventId ?? ''}`
            : '',
        overlays.communityDeepLink
            ? `${overlays.communityDeepLink.postId ?? ''}|${overlays.communityDeepLink.openComments ? '1' : '0'}`
            : '',
        clusterSig,
        o.settings.appearance.theme,
        o.settings.appearance.backgroundPreset ?? 'none',
        o.settings.appearance.wallpaperStamp ?? 0,
        o.settings.performance.litePerformance ?? 'auto',
    ].join('|');
}

function executionLifecycleCacheKey(
    files: Orchestration['workspace']['executionFiles'],
): string {
    if (!files.length) return '0';
    let lifecycleCount = 0;
    let stamp = 0;
    for (let i = 0; i < files.length; i += 1) {
        const f = files[i];
        if (!f.executionTrashDeletedAt && !f.executionArchivedAt) continue;
        lifecycleCount += 1;
        stamp ^= hashString(
            `${String(f.id ?? i)}:${f.executionTrashDeletedAt ?? ''}:${f.executionArchivedAt ?? ''}`,
        );
        if (lifecycleCount >= 48) break;
    }
    return `${files.length}:${lifecycleCount}:${stamp}`;
}

function hashString(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i += 1) {
        h = (h * 31 + value.charCodeAt(i)) | 0;
    }
    return h;
}
