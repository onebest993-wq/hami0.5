import { assembleLawyerDashboardReadyView } from '@/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView';
import { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';
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
    quantum,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardCoreParams): LawyerDashboardCoreViewModel {
    const orchestration = useLawyerDashboardCoreOrchestration({ onNavigateToCase, quantum });

    if (orchestration.authGate) return { status: 'gate', node: orchestration.authGate };
    if (!orchestration.user) return { status: 'empty' };

    return assembleLawyerDashboardReadyView({
        ...orchestration,
        onLogout,
        onAppNavigate,
        onNavigateToCase,
        backgroundRuntimeEnabled,
    });
}
