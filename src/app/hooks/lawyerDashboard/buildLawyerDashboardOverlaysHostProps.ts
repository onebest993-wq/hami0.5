// @ts-nocheck
import type { LawyerDashboardOverlaysHostProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import { pickLawyerDashboardWorkspaceOverlayBundles } from '@/app/hooks/lawyerDashboard/pickLawyerDashboardWorkspaceOverlayBundles';
import type { BuildLawyerDashboardOverlaysHostParams } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardOverlaysHostProps.types';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

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
    nav,
}: BuildLawyerDashboardOverlaysHostParams): LawyerDashboardOverlaysHostProps {
    const workspaceBundles = pickLawyerDashboardWorkspaceOverlayBundles(workspace, {
        isNotepadOpen: overlays.isNotepadOpen,
        notepadMode: overlays.notepadMode,
        notepadFocusNoteId: overlays.notepadFocusNoteId,
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
            executionFiles,
            executionFilesHydrating: !workspace.storageHydrated,
            globalNotes,
            searchNotifications,
            criminalCasesForCluster,
        },
        overlays,
        criminalBridge,
        ...workspaceBundles,
        nav,
    };
}
