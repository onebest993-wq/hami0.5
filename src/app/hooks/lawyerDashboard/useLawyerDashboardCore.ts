import { createElement, lazy, Suspense, useMemo, useRef } from 'react';
import { isSplashGuardFrozen } from '@/app/bootstrap/bootReveal';
import { assembleLawyerDashboardReadyView } from '@/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView';
import { buildLawyerDashboardTabStackMask } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardTabStackMask';
import { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';
import { patchLawyerDashboardHeaderOverlayOpen } from '@/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen';
import type {
    LawyerDashboardCoreViewModel,
    UseLawyerDashboardCoreParams,
} from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

export type { BuildLawyerDashboardOverlaysBundleParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.types';
export type { LawyerDashboardCoreViewModel, UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

type ReadyViewModel = Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;

const LawyerBootShellLazy = lazy(() =>
    import('@/app/bootstrap/LawyerBootShell').then((m) => ({ default: m.LawyerBootShell })),
);

/** نفس خلفية الغلاف المجمّد — بلا نص/شعار حتى يكتمل chunk */
const lawyerBootShellFallback = createElement('div', {
    className: 'min-h-screen w-full bg-[#0a0f1c]',
    'data-testid': 'lawyer-boot-shell-loading',
    'aria-busy': true,
    'aria-label': 'تهيئة حامي',
});

function createLawyerBootShellGateNode() {
    return createElement(
        Suspense,
        { fallback: lawyerBootShellFallback },
        createElement(LawyerBootShellLazy),
    );
}

export function useLawyerDashboardCore({
    onLogout,
    onNavigateToCase,
    onAppNavigate,
    authUser,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardCoreParams): LawyerDashboardCoreViewModel {
    const orchestration = useLawyerDashboardCoreOrchestration({
        authUser,
        onNavigateToCase,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
        backgroundRuntimeEnabled,
    });

    /** يثبت هيكل اللوحة بعد أول ready — يمنع تفريغ الهيدر/الدوك لشعار الإقلاع عند وميض auth */
    const latchedReadyRef = useRef<ReadyViewModel | null>(null);

    const stableReady = useMemo((): LawyerDashboardCoreViewModel => {
        if (orchestration.authGate) {
            latchedReadyRef.current = null;
            return { status: 'gate', node: orchestration.authGate };
        }

        if (!orchestration.user) {
            if (isSplashGuardFrozen() && latchedReadyRef.current) {
                return latchedReadyRef.current;
            }
            return { status: 'gate', node: createLawyerBootShellGateNode() };
        }

        const ready = assembleLawyerDashboardReadyView({
            ...orchestration,
            onLogout,
            onAppNavigate,
            onNavigateToCase,
            backgroundRuntimeEnabled,
        });
        latchedReadyRef.current = ready;
        return ready;
    }, [
        orchestration,
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
            showCommunity: orchestration.dashboardCommunity.showCommunity,
            showNotifications: orchestration.notifications.showNotifications,
            notificationsUnreadCount: orchestration.notifications.notificationsUnreadCount,
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
    }, [stableReady, orchestration]);
}
