import { useState } from 'react';
import { useLawsuitFilesState } from '@/app/hooks/useLawsuitFilesState';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

export type UseLawyerDashboardWorkspaceStemParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
};

export function useLawyerDashboardWorkspaceStem({
    localAutoSave,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardWorkspaceStemParams) {
    const [activeFile, setActiveFile] = useState<FileData | ExecutionFile | null>(null);

    const lawsuitFiles = useLawsuitFilesState({
        localAutoSave,
        backgroundRuntimeEnabled,
    });

    return {
        activeFile,
        setActiveFile,
        ...lawsuitFiles,
    };
}

export type LawyerDashboardWorkspaceStem = ReturnType<typeof useLawyerDashboardWorkspaceStem>;
