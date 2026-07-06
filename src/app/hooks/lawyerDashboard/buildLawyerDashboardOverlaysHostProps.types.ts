import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import type { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';

type Workspace = ReturnType<typeof useLawyerDashboardWorkspace>;

export type BuildLawyerDashboardOverlaysHostParams = {
    onLogout: () => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
    onNavigateToCase?: (caseId: string) => void;
    user: { id?: string } | null;
    authUser: { id?: string } | null;
    shapeClass: string;
    theme: { bg: string; [key: string]: unknown };
    files: LawyerDashboardOverlaysHostProps['data']['files'];
    executionFiles: Workspace['executionFiles'];
    globalNotes: LawyerDashboardOverlaysHostProps['data']['globalNotes'];
    searchNotifications: LawyerDashboardOverlaysHostProps['data']['searchNotifications'];
    criminalCasesForCluster: LawyerDashboardOverlaysHostProps['data']['criminalCasesForCluster'];
    overlays: LawyerDashboardOverlaysHostProps['overlays'];
    criminalBridge: LawyerDashboardOverlaysHostProps['criminalBridge'];
    workspace: Workspace;
    nav: LawyerDashboardOverlaysHostProps['nav'];
};
