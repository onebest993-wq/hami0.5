import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import { pickLawyerDashboardWorkspaceOverlayBundles } from '@/app/hooks/lawyerDashboard/pickLawyerDashboardWorkspaceOverlayBundles';
import type { BuildLawyerDashboardOverlaysHostParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysHostProps.types';

export function buildLawyerDashboardOverlaysHostProps({
    onLogout,
    onAppNavigate,
    onNavigateToCase,
    user,
    authUser,
    shapeClass,
    theme,
    files,
    executionFiles,
    globalNotes,
    searchNotifications,
    criminalCasesForCluster,
    overlays,
    criminalBridge,
    workspace,
    urgent,
    client,
    nav,
}: BuildLawyerDashboardOverlaysHostParams): LawyerDashboardOverlaysHostProps {
    const workspaceBundles = pickLawyerDashboardWorkspaceOverlayBundles(workspace);

    return {
        shell: {
            onLogout,
            onAppNavigate,
            onNavigateToCase,
            userId: user?.id || '',
            authUserId: authUser?.id,
            shapeClass,
            theme,
            lawyerShellAccess: Boolean(user ?? authUser),
        },
        data: {
            files,
            executionFiles,
            globalNotes,
            searchNotifications,
            criminalCasesForCluster,
        },
        overlays,
        criminalBridge,
        ...workspaceBundles,
        urgent,
        client,
        nav,
    };
}
