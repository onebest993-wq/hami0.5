import type { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';
import type { LawyerDashboardGlobalSearchState } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import type { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import type { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import type { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import type { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import type { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import type { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';

/**
 * حالة overlays المدمجة — كما تُعاد من useLawyerDashboardCoreOrchestration.
 * (useLawyerDashboardOverlays + settings + transactions + repository + search + …)
 */
export type LawyerDashboardMergedOverlaysState = ReturnType<typeof useLawyerDashboardOverlays> &
    ReturnType<typeof useLawyerDashboardSettings> &
    ReturnType<typeof useLawyerDashboardTransactions> &
    ReturnType<typeof useLawyerDashboardRepository> &
    LawyerDashboardGlobalSearchState &
    ReturnType<typeof useLawyerDashboardFieldTasks> &
    ReturnType<typeof useLawyerDashboardScheduleTab> &
    ReturnType<typeof useLawyerDashboardCommunity> &
    ReturnType<typeof useLawyerDashboardHomeTab> & {
        openGlobalSearch: (seed?: string) => void;
        openSettings: () => void;
        openProfileTab: () => void;
        closeHubShellOverlays: () => void;
        exitToHomeDashboard: () => void;
    };
