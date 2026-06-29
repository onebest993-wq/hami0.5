import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import type { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';

export type BuildLawyerDashboardOverlaysHostParams = {
    onLogout: () => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
    onNavigateToCase?: (caseId: string) => void;
    user: { id?: string } | null;
    authUser: { id?: string } | null;
    shapeClass: string;
    theme: { bg: string; [key: string]: unknown };
    files: LawyerDashboardOverlaysHostProps['data']['files'];
    executionFiles: LawyerDashboardOverlaysHostProps['data']['executionFiles'];
    globalNotes: LawyerDashboardOverlaysHostProps['data']['globalNotes'];
    searchNotifications: LawyerDashboardOverlaysHostProps['data']['searchNotifications'];
    criminalCasesForCluster: LawyerDashboardOverlaysHostProps['data']['criminalCasesForCluster'];
    overlays: LawyerDashboardOverlaysHostProps['overlays'];
    criminalBridge: LawyerDashboardOverlaysHostProps['criminalBridge'];
    workspace: ReturnType<typeof useLawyerDashboardWorkspace>;
    nav: LawyerDashboardOverlaysHostProps['nav'];
};
