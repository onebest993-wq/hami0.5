import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerDashboardWorkspaceHeavy } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy';

const noop = () => undefined;
const noopAsync = async () => undefined;
const noopResolve = () => null as string | null;

/** حقول workspace الثقيلة قبل تحميل المقطع — لا تُستدعى عادةً قبل interactive. */
export function createLawyerDashboardWorkspaceHeavyStubs(): LawyerDashboardWorkspaceHeavy {
    return {
        moveLawsuitToTrash: noopAsync,
        restoreLawsuitFromTrash: noopAsync,
        archiveLawsuit: noopAsync,
        restoreArchivedLawsuit: noopAsync,
        permanentlyDeleteLawsuits: noopAsync,
        handleDeleteFile: noopAsync,
        handleRestoreFile: noopAsync,
        isNewCaseModalOpen: false,
        isCriminalSeveranceRedirect: false,
        consolidationNavActive: false,
        dossierNewCaseElevated: false,
        openNormalNewCaseModal: noop,
        openSeveranceNewCaseModal: noop,
        closeNewCaseModal: noop,
        initiateSubFile: noop,
        handleSpawnLinkedIncidentalCase: noop,
        handleStartConsolidationNewCase: noop,
        handleConsolidateWithExisting: noop,
        handleLinkWithExistingCase: noop,
        handleNewCaseSave: noopAsync,
        newCaseModalKey: 0,
        consolidationSpawnNav: null as null | { label: string },
        onNewCaseOpenCriminalDashboard: noop as (caseId: string) => void,
        presetSelectedType: undefined as 'criminal' | 'civil' | undefined,
        globalNotes: [] as GlobalNote[],
        setGlobalNotes: noop as Dispatch<SetStateAction<GlobalNote[]>>,
        mergeNotesStores: ((_notes?: unknown) => undefined) as (rawNotes?: unknown) => void,
        resolveNotesUserId: noopResolve,
        handleSaveNote: noopAsync,
        handleDeleteNote: noopAsync,
        handleConvertNote: noopAsync,
        handleNotepadConvert: noopAsync,
        executionFiles: [] as ExecutionFile[],
        setExecutionFiles: noop as Dispatch<SetStateAction<ExecutionFile[]>>,
        reloadExecutionFiles: noopAsync,
        moveExecutionToTrash: noopAsync,
        restoreExecutionFromTrash: noopAsync,
        archiveExecution: noopAsync,
        restoreArchivedExecution: noopAsync,
        permanentlyDeleteExecutions: noopAsync,
        isExecutionModalOpen: false,
        setIsExecutionModalOpen: noop as Dispatch<SetStateAction<boolean>>,
        handleAddExecutionFile: noopAsync,
        handleUpdateExecutionFile: noopAsync,
        openExecutionArchiveFile: noop,
        storageHydrated: false,
        openArchiveFile: noop,
        handleUpdateFile: noopAsync,
        handleOpenLinkedFile: noop,
        caseLinkNav: null as null | { browse: boolean },
        caseLinkBrowse: null as unknown,
        caseLinkViewOnly: false,
        returnFromCaseLinkBrowse: noop,
        clearCaseLinkBrowse: noop,
        handleUnlinkCaseLink: noopAsync,
    } as unknown as LawyerDashboardWorkspaceHeavy;
}
