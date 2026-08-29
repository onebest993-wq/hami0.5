import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
import { pickLawyerDashboardWorkspaceOverlayBundles } from '@/app/hooks/lawyerDashboard/pickLawyerDashboardWorkspaceOverlayBundles';
import type { BuildLawyerDashboardOverlaysBundleParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysBundleProps.types';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

export function buildLawyerDashboardOverlaysBundleProps({
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
    nav,
}: BuildLawyerDashboardOverlaysBundleParams): LawyerDashboardOverlaysBundleProps {
    const workspaceBundles = pickLawyerDashboardWorkspaceOverlayBundles(workspace, {
        isNotepadOpen: overlays.isNotepadOpen,
        notepadMode: overlays.notepadMode,
        notepadFocusNoteId: overlays.focusNoteId,
        notepadSessionKey: overlays.notepadSessionKey,
        repositoryTab: overlays.repositoryTab ?? 'notepad',
        vaultOpenScanner: overlays.vaultOpenScanner ?? false,
        closeNotepad: overlays.closeNotepad,
    });

    return {
        shell: {
            onLogout,
            onAppNavigate,
            onNavigateToCase,
            userId: user?.id || '',
            authUserId: authUser?.id,
            shapeClass,
            theme,
            lawyerShellAccess: Boolean(user ?? authUser ?? readPersistedSupabaseAuth().user),
        },
        data: {
            files,
            executionFiles: executionFiles.map((file) => coerceExecutionFilePreserveId(file)),
            executionFilesHydrating: !workspace.storageHydrated,
            globalNotes,
            searchNotifications,
            criminalCasesForCluster,
            lawsuitLifecycleCounts: workspace.lawsuitLifecycleCounts,
            lawsuitLifecycleIndex: workspace.lawsuitSegments.index,
            lawsuitArchivedFiles: workspace.lawsuitArchivedFiles,
            lawsuitTrashFiles: workspace.lawsuitTrashFiles,
            ensureLawsuitArchivedLoaded: workspace.ensureLawsuitArchivedLoaded,
            ensureLawsuitTrashLoaded: workspace.ensureLawsuitTrashLoaded,
            lawsuitFilesHydrating: workspace.lawsuitStorageHydrated === false,
        },
        overlays,
        criminalBridge,
        ...workspaceBundles,
        nav,
    };
}
