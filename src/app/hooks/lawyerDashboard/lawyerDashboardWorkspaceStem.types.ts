import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/fileDataTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawsuitFileSegments } from '@/app/domain/lawsuit/lawsuitFileSegments';
import type { LawsuitLifecycleCounts } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import type { LawsuitLifecycleMutationKind } from '@/app/domain/lawsuit/lawsuitLifecycleTransaction';

export type UseLawyerDashboardWorkspaceStemParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
};

export type LawyerDashboardWorkspaceStem = {
    activeFile: FileData | ExecutionFile | null;
    setActiveFile: Dispatch<SetStateAction<FileData | ExecutionFile | null>>;
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    lawsuitSegments: LawsuitFileSegments;
    setLawsuitSegments: Dispatch<SetStateAction<LawsuitFileSegments>>;
    commitLawsuitLifecycleMutation: (
        kind: LawsuitLifecycleMutationKind,
        ids: readonly (string | number)[],
    ) => Promise<LawsuitFileSegments | null>;
    lawsuitLifecycleCounts: LawsuitLifecycleCounts;
    lawsuitArchivedFiles: FileData[] | null;
    lawsuitTrashFiles: FileData[] | null;
    ensureLawsuitArchivedLoaded: () => Promise<void>;
    ensureLawsuitTrashLoaded: () => Promise<void>;
    reloadLawsuitFiles: () => FileData[];
    lawsuitStorageHydrated: boolean;
};
