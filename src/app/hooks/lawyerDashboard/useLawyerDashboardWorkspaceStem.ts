import { useState } from 'react';
import { useLawsuitFilesState } from '@/app/hooks/useLawsuitFilesState';
import type { FileData } from '@/app/domain/lawsuit/fileDataTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type {
    LawyerDashboardWorkspaceStem,
    UseLawyerDashboardWorkspaceStemParams,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';

export type {
    LawyerDashboardWorkspaceStem,
    UseLawyerDashboardWorkspaceStemParams,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardWorkspaceStem.types';

export function useLawyerDashboardWorkspaceStem({
    localAutoSave,
    backgroundRuntimeEnabled,
}: UseLawyerDashboardWorkspaceStemParams): LawyerDashboardWorkspaceStem {
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
