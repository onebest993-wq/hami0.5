import type { LawyerDashboardTabStackMaskState } from '@/app/hooks/lawyerDashboard/lawyerDashboardTabStack';
import type { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';

type Orchestration = ReturnType<typeof useLawyerDashboardCoreOrchestration>;

export function buildLawyerDashboardTabStackMask(o: Orchestration): LawyerDashboardTabStackMaskState {
    return {
        isCriminalDossierOpen: o.overlays.isCriminalDossierOpen,
        archiveType: o.archiveAndSync.archiveType,
        showLawsuitsWorkspace: o.overlays.showLawsuitsWorkspace,
        showTransactions: o.dashboardTransactions.showTransactions,
        isNotepadOpen: o.dashboardRepository.isRepositoryOpen,
        showSettings: o.dashboardSettings.showSettings,
        showCommunity: o.dashboardCommunity.showCommunity,
        activeFile: o.workspace.activeFile,
        showDocs: o.dashboardRepository.isRepositoryOpen,
    };
}
