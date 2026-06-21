import { useMemo } from 'react';
import { assembleLawyerDashboardReadyView } from '@/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView';
import { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';
import type {
    LawyerDashboardCoreViewModel,
    UseLawyerDashboardCoreParams,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export type { BuildLawyerDashboardOverlaysHostParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysHostProps.types';
export type { LawyerDashboardCoreViewModel, UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

type Orchestration = ReturnType<typeof useLawyerDashboardCoreOrchestration>;

/** بصمة خفيفة — إعادة تجميع الواجهة فقط عند تغيّرات ذات معنى */
function dashboardViewFingerprint(o: Orchestration): string {
    const { overlays, workspace, appAlerts, notifications, urgent } = o;
    return [
        o.user?.id ?? '',
        overlays.activeTab,
        overlays.showSettings,
        overlays.homeLayoutEditMode,
        overlays.showCommunity,
        overlays.showLawsuitsWorkspace,
        overlays.showGlobalSearch,
        overlays.showDocs,
        overlays.criminalDashboardCaseId ?? '',
        workspace.files.length,
        workspace.executionFiles.length,
        workspace.globalNotes.length,
        workspace.activeFile?.id ?? '',
        appAlerts.visibleAppAlerts.length,
        appAlerts.appAlertsLoading ? '1' : '0',
        appAlerts.appAlertsError ?? '',
        notifications.showNotifications ? '1' : '0',
        notifications.notificationsUnreadCount,
        urgent.showUrgentDashboard ? '1' : '0',
        o.pendingFieldTasksCount,
        o.theme.primary,
        o.shapeClass,
        o.appLock.appLocked ? '1' : '0',
    ].join('|');
}

export function useLawyerDashboardCore({
    onLogout,
    onNavigateToCase,
    onAppNavigate,
    quantum,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardCoreParams): LawyerDashboardCoreViewModel {
    const orchestration = useLawyerDashboardCoreOrchestration({ onNavigateToCase, quantum });

    const viewFingerprint = orchestration.authGate
        ? `gate:${String(orchestration.authGate)}`
        : !orchestration.user
          ? 'empty'
          : dashboardViewFingerprint(orchestration);

    return useMemo((): LawyerDashboardCoreViewModel => {
        if (orchestration.authGate) return { status: 'gate', node: orchestration.authGate };
        if (!orchestration.user) return { status: 'empty' };

        return assembleLawyerDashboardReadyView({
            ...orchestration,
            onLogout,
            onAppNavigate,
            onNavigateToCase,
            backgroundRuntimeEnabled,
        });
    }, [
        viewFingerprint,
        onLogout,
        onAppNavigate,
        onNavigateToCase,
        backgroundRuntimeEnabled,
    ]);
}
