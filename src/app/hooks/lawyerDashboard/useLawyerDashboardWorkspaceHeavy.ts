import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { useLawsuitFileMutations } from '@/app/hooks/useLawsuitFileMutations';
import { useLawsuitNewCaseFlow } from '@/app/hooks/useLawsuitNewCaseFlow';
import { useLawsuitActiveDossier } from '@/app/hooks/useLawsuitActiveDossier';
import { useLawyerExecutionFiles, type LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import { useLawyerGlobalNotes } from '@/app/hooks/useLawyerGlobalNotes';
import type { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawyerDashboardWorkspaceStem } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceStem';

function unpinWorkspaceForDeletedFile(file: { id: string | number; type?: string }): void {
    void import('@/app/workspace/unpinWorkspaceEntity')
        .then((m) => m.unpinWorkspaceForDeletedFile(file))
        .catch(() => undefined);
}

type CriminalBridge = ReturnType<typeof useCriminalDashboardBridge>;

export type UseLawyerDashboardWorkspaceHeavyParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
    user: User | null;
    authUserId: string | undefined;
    refreshAppAlerts: () => void;
    showLawsuitsWorkspace: boolean;
    archiveType: LawyerArchiveOverlay;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    criminalBridge: CriminalBridge;
    onOpenCriminalDashboard: (caseId: string) => void;
    bumpSearchIndex: () => void;
    selectCase: (caseId: string) => void;
    closeNotepad: () => void;
    stem: LawyerDashboardWorkspaceStem;
};

export function useLawyerDashboardWorkspaceHeavy({
    localAutoSave,
    backgroundRuntimeEnabled,
    user,
    authUserId,
    refreshAppAlerts,
    showLawsuitsWorkspace: _showLawsuitsWorkspace,
    archiveType,
    setArchiveType,
    criminalBridge,
    onOpenCriminalDashboard,
    bumpSearchIndex,
    selectCase,
    closeNotepad,
    stem,
}: UseLawyerDashboardWorkspaceHeavyParams) {
    const {
        activeFile,
        setActiveFile,
        files,
        setFiles,
        setLawsuitSegments,
    } = stem;

    const lawsuitMutations = useLawsuitFileMutations({
        setLawsuitSegments,
        setActiveFile,
        userId: user?.id,
        authUserId,
        refreshAppAlerts,
        unpinWorkspaceForDeletedFile,
    });

    const lawsuitNewCase = useLawsuitNewCaseFlow({
        files,
        setFiles,
        setLawsuitSegments,
        activeFile,
        setActiveFile,
        userId: user?.id,
        criminalBridge,
        onOpenCriminalDashboard,
    });

    const notes = useLawyerGlobalNotes({
        localAutoSave,
        backgroundRuntimeEnabled,
        user,
        authUserId,
        refreshAppAlerts,
        bumpSearchIndex,
        setFiles,
        openNormalNewCaseModal: lawsuitNewCase.openNormalNewCaseModal,
        closeNotepad,
    });

    const execution = useLawyerExecutionFiles({
        localAutoSave,
        backgroundRuntimeEnabled,
        userId: user?.id,
        authUserId,
        refreshAppAlerts,
        setActiveFile: setActiveFile as Dispatch<
            SetStateAction<FileData | import('@/app/types/execution').ExecutionFile | null>
        >,
        setArchiveType,
        archiveType,
    });

    const dossier = useLawsuitActiveDossier({
        files,
        setFiles,
        activeFile,
        setActiveFile,
        userId: user?.id,
        refreshAppAlerts,
        selectCase,
        openExecutionArchiveFile: execution.openExecutionArchiveFile,
        onOpenLinkedCriminalCase: onOpenCriminalDashboard,
    });

    return {
        ...lawsuitMutations,
        ...lawsuitNewCase,
        ...notes,
        ...execution,
        ...dossier,
    };
}

export type LawyerDashboardWorkspaceHeavy = ReturnType<typeof useLawyerDashboardWorkspaceHeavy>;
