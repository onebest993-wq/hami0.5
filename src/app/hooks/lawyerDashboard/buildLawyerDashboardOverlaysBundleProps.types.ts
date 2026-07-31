import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import type { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';

type Workspace = ReturnType<typeof useLawyerDashboardWorkspace>;

export type BuildLawyerDashboardOverlaysBundleParams = {
    onLogout: () => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
    onNavigateToCase?: (caseId: string) => void;
    user: { id?: string } | null;
    authUser: { id?: string } | null;
    shapeClass: string;
    theme: { bg: string; [key: string]: unknown };
    files: LawyerDashboardOverlaysBundleProps['data']['files'];
    executionFiles: Workspace['executionFiles'];
    globalNotes: LawyerDashboardOverlaysBundleProps['data']['globalNotes'];
    searchNotifications: LawyerDashboardOverlaysBundleProps['data']['searchNotifications'];
    criminalCasesForCluster: LawyerDashboardOverlaysBundleProps['data']['criminalCasesForCluster'];
    overlays: LawyerDashboardOverlaysBundleProps['overlays'];
    criminalBridge: LawyerDashboardOverlaysBundleProps['criminalBridge'];
    workspace: Workspace;
    nav: LawyerDashboardOverlaysBundleProps['nav'];
};
