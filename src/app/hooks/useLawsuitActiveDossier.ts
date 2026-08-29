import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/domain/lawsuit/lawsuitFileTypes';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    useLawsuitActiveDossierCaseLink,
    type CaseLinkBrowseSession,
} from '@/app/hooks/useLawsuitActiveDossierCaseLink';
import { useLawsuitActiveDossierOpenUpdate } from '@/app/hooks/useLawsuitActiveDossierOpenUpdate';

type ActiveFile = FileData | ExecutionFile | null;

export type { CaseLinkBrowseSession };

export type UseLawsuitActiveDossierOptions = {
    files: FileData[];
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    activeFile: ActiveFile;
    setActiveFile: Dispatch<SetStateAction<ActiveFile>>;
    userId?: string | null;
    refreshAppAlerts: () => void | Promise<void>;
    selectCase: (caseId: string) => void;
    openExecutionArchiveFile: (file: unknown) => boolean | Promise<boolean>;
    onOpenLinkedCriminalCase?: (criminalId: string) => void;
};

export function useLawsuitActiveDossier({
    files,
    setFiles,
    activeFile,
    setActiveFile,
    userId,
    refreshAppAlerts,
    selectCase,
    openExecutionArchiveFile,
    onOpenLinkedCriminalCase,
}: UseLawsuitActiveDossierOptions) {
    const caseLink = useLawsuitActiveDossierCaseLink({
        files,
        setFiles,
        activeFile,
        setActiveFile,
        userId,
        refreshAppAlerts,
        selectCase,
        onOpenLinkedCriminalCase,
    });

    const { openArchiveFile, handleUpdateFile } = useLawsuitActiveDossierOpenUpdate({
        files,
        setFiles,
        setActiveFile,
        userId,
        refreshAppAlerts,
        selectCase,
        openExecutionArchiveFile,
        caseLinkBrowse: caseLink.caseLinkBrowse,
        setCaseLinkBrowse: caseLink.setCaseLinkBrowse,
        scrubOpenTarget: caseLink.scrubOpenTarget,
    });

    return {
        openArchiveFile,
        handleUpdateFile,
        handleOpenLinkedFile: caseLink.handleOpenLinkedFile,
        caseLinkNav: caseLink.caseLinkNav,
        caseLinkBrowse: caseLink.caseLinkBrowse,
        caseLinkViewOnly: caseLink.caseLinkViewOnly,
        returnFromCaseLinkBrowse: caseLink.returnFromCaseLinkBrowse,
        clearCaseLinkBrowse: caseLink.clearCaseLinkBrowse,
        handleUnlinkCaseLink: caseLink.handleUnlinkCaseLink,
    };
}
