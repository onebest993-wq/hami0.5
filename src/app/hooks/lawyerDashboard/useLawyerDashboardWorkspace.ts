import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Dispatch, SetStateAction } from 'react';
import { useLawsuitFilesState } from '@/app/hooks/useLawsuitFilesState';
import { useLawsuitFileMutations } from '@/app/hooks/useLawsuitFileMutations';
import { useLawsuitNewCaseFlow } from '@/app/hooks/useLawsuitNewCaseFlow';
import { useLawsuitActiveDossier } from '@/app/hooks/useLawsuitActiveDossier';
import { useLawyerExecutionFiles, type LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import { useLawyerGlobalNotes } from '@/app/hooks/useLawyerGlobalNotes';
import { unpinWorkspaceForDeletedFile } from '@/app/workspace/unpinWorkspaceEntity';
import type { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

type CriminalBridge = ReturnType<typeof useCriminalDashboardBridge>;

export type UseLawyerDashboardWorkspaceParams = {
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
};

export function useLawyerDashboardWorkspace({
    localAutoSave,
    backgroundRuntimeEnabled,
    user,
    authUserId,
    refreshAppAlerts,
    showLawsuitsWorkspace,
    archiveType,
    setArchiveType,
    criminalBridge,
    onOpenCriminalDashboard,
    bumpSearchIndex,
    selectCase,
    closeNotepad,
}: UseLawyerDashboardWorkspaceParams) {
    const [activeFile, setActiveFile] = useState<FileData | ExecutionFile | null>(null);

    const { files, setFiles, reloadLawsuitFiles } = useLawsuitFilesState({
        localAutoSave,
        backgroundRuntimeEnabled,
    });

    const lawsuitMutations = useLawsuitFileMutations({
        files,
        setFiles,
        setActiveFile,
        userId: user?.id,
        authUserId,
        refreshAppAlerts,
        showLawsuitsWorkspace,
        unpinWorkspaceForDeletedFile,
    });

    const lawsuitNewCase = useLawsuitNewCaseFlow({
        files,
        setFiles,
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
    });

    return {
        activeFile,
        setActiveFile,
        files,
        setFiles,
        reloadLawsuitFiles,
        archiveType,
        setArchiveType,
        ...lawsuitMutations,
        ...lawsuitNewCase,
        ...notes,
        ...execution,
        ...dossier,
    };
}
