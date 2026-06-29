import { createElement, useMemo } from 'react';
import { LawyerBootShell } from '@/app/bootstrap/LawyerBootShell';
import { assembleLawyerDashboardReadyView } from '@/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView';
import { buildLawyerDashboardTabStackMask } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardTabStackMask';
import { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';
import {
    dashboardHeaderOverlayFingerprint,
    dashboardShellFingerprint,
} from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint';
import { patchLawyerDashboardHeaderOverlayOpen } from '@/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen';
import type {
    LawyerDashboardCoreViewModel,
    UseLawyerDashboardCoreParams,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export type { BuildLawyerDashboardOverlaysHostParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysHostProps.types';
export type { LawyerDashboardCoreViewModel, UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export function useLawyerDashboardCore({
    onLogout,
    onNavigateToCase,
    onAppNavigate,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardCoreParams): LawyerDashboardCoreViewModel {
    const orchestration = useLawyerDashboardCoreOrchestration({
        onNavigateToCase,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
    });

    const shellFingerprint = orchestration.authGate
        ? `gate:${String(orchestration.authGate)}`
        : !orchestration.user
          ? 'boot'
          : dashboardShellFingerprint(orchestration);

    const headerOverlayFingerprint =
        orchestration.authGate || !orchestration.user
            ? ''
            : dashboardHeaderOverlayFingerprint(orchestration);

    const stableReady = useMemo((): LawyerDashboardCoreViewModel => {
        if (orchestration.authGate) return { status: 'gate', node: orchestration.authGate };
        if (!orchestration.user) return { status: 'gate', node: createElement(LawyerBootShell) };

        return assembleLawyerDashboardReadyView({
            ...orchestration,
            onLogout,
            onAppNavigate,
            onNavigateToCase,
            backgroundRuntimeEnabled,
        });
    }, [
        shellFingerprint,
        onLogout,
        onAppNavigate,
        onNavigateToCase,
        backgroundRuntimeEnabled,
    ]);

    return useMemo((): LawyerDashboardCoreViewModel => {
        if (stableReady.status !== 'ready') return stableReady;

        return patchLawyerDashboardHeaderOverlayOpen(stableReady, {
            showSettings: orchestration.dashboardSettings.showSettings,
            showGlobalSearch: orchestration.overlays.showGlobalSearch,
            showNotifications: orchestration.notifications.showNotifications,
            activeTab: orchestration.overlays.activeTab,
            tabStackMask: buildLawyerDashboardTabStackMask(orchestration),
            headerVisibility: {
                showSettings: orchestration.dashboardSettings.showSettings,
                isNewCaseModalOpen: orchestration.workspace.isNewCaseModalOpen,
                isNotepadOpen: orchestration.dashboardRepository.isRepositoryOpen,
                showCommunity: orchestration.dashboardCommunity.showCommunity,
                activeTab: orchestration.overlays.activeTab,
                activeFile: orchestration.workspace.activeFile,
                archiveType: orchestration.archiveAndSync.archiveType,
                showLawsuitsWorkspace: orchestration.overlays.showLawsuitsWorkspace,
                showTransactions: orchestration.dashboardTransactions.showTransactions,
                showTasksManager: orchestration.overlays.showTasksManager,
                showDocs: orchestration.dashboardRepository.isRepositoryOpen,
                isCriminalDossierOpen: orchestration.overlays.isCriminalDossierOpen,
            },
        });
    }, [stableReady, headerOverlayFingerprint]);
}
