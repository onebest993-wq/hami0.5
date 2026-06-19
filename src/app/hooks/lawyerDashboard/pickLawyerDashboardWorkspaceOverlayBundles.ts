import type {
    LawyerDashboardArchiveBundle,
    LawyerDashboardDossierBundle,
    LawyerDashboardExecutionCreateBundle,
    LawyerDashboardNewCaseBundle,
    LawyerDashboardNotepadBundle,
} from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysHostBundles';
import type { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';

type Workspace = ReturnType<typeof useLawyerDashboardWorkspace>;

export function pickLawyerDashboardDossierBundle(workspace: Workspace): LawyerDashboardDossierBundle {
    const {
        activeFile,
        setActiveFile,
        handleUpdateFile,
        handleUpdateExecutionFile,
        handleDeleteFile,
        initiateSubFile,
        handleSpawnLinkedIncidentalCase,
        handleOpenLinkedFile,
        handleStartConsolidationNewCase,
        handleConsolidateWithExisting,
        handleLinkWithExistingCase,
        consolidationNavActive,
        caseLinkNav,
        consolidationSpawnNav,
    } = workspace;

    return {
        activeFile,
        setActiveFile,
        handleUpdateFile,
        handleUpdateExecutionFile,
        handleDeleteFile,
        initiateSubFile,
        handleSpawnLinkedIncidentalCase,
        handleOpenLinkedFile,
        handleStartConsolidationNewCase,
        handleConsolidateWithExisting,
        handleLinkWithExistingCase,
        consolidationNavActive,
        caseLinkNav,
        consolidationSpawnNav,
    };
}

export function pickLawyerDashboardArchiveBundle(workspace: Workspace): LawyerDashboardArchiveBundle {
    const {
        archiveType,
        setArchiveType,
        openArchiveFile,
        handleRestoreFile,
        moveExecutionToTrash,
        restoreExecutionFromTrash,
        permanentlyDeleteExecutions,
        moveLawsuitToTrash,
        restoreLawsuitFromTrash,
        archiveLawsuit,
        restoreArchivedLawsuit,
        permanentlyDeleteLawsuits,
    } = workspace;

    return {
        archiveType,
        setArchiveType,
        openArchiveFile,
        handleRestoreFile,
        moveExecutionToTrash,
        restoreExecutionFromTrash,
        permanentlyDeleteExecutions,
        moveLawsuitToTrash,
        restoreLawsuitFromTrash,
        archiveLawsuit,
        restoreArchivedLawsuit,
        permanentlyDeleteLawsuits,
    };
}

export function pickLawyerDashboardNotepadBundle(workspace: Workspace): LawyerDashboardNotepadBundle {
    const {
        isNotepadOpen,
        setIsNotepadOpen,
        notepadMode,
        setNotepadMode,
        notepadFocusNoteId,
        setNotepadFocusNoteId,
        handleSaveNote,
        handleDeleteNote,
        handleNotepadConvert,
    } = workspace;

    return {
        isNotepadOpen,
        setIsNotepadOpen,
        notepadMode,
        setNotepadMode,
        notepadFocusNoteId,
        setNotepadFocusNoteId,
        handleSaveNote,
        handleDeleteNote,
        handleNotepadConvert,
    };
}

export function pickLawyerDashboardNewCaseBundle(workspace: Workspace): LawyerDashboardNewCaseBundle {
    const {
        isNewCaseModalOpen,
        openNormalNewCaseModal,
        closeNewCaseModal,
        newCaseModalKey,
        newCasePresetType,
        isCriminalSeveranceRedirect,
        onNewCaseOpenCriminalDashboard,
        handleNewCaseSave,
    } = workspace;

    return {
        isNewCaseModalOpen,
        openNormalNewCaseModal,
        closeNewCaseModal,
        newCaseModalKey,
        newCasePresetType,
        isCriminalSeveranceRedirect,
        onNewCaseOpenCriminalDashboard,
        handleNewCaseSave,
    };
}

export function pickLawyerDashboardExecutionCreateBundle(
    workspace: Workspace,
): LawyerDashboardExecutionCreateBundle {
    const { isExecutionModalOpen, setIsExecutionModalOpen, handleAddExecutionFile } = workspace;

    return {
        isExecutionModalOpen,
        setIsExecutionModalOpen,
        handleAddExecutionFile,
    };
}

export function pickLawyerDashboardWorkspaceOverlayBundles(workspace: Workspace) {
    return {
        dossier: pickLawyerDashboardDossierBundle(workspace),
        archive: pickLawyerDashboardArchiveBundle(workspace),
        notepad: pickLawyerDashboardNotepadBundle(workspace),
        newCase: pickLawyerDashboardNewCaseBundle(workspace),
        executionCreate: pickLawyerDashboardExecutionCreateBundle(workspace),
    };
}
