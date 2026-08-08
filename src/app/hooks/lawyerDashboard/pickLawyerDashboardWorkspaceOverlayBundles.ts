import type {
    LawyerDashboardArchiveBundle,
    LawyerDashboardDossierBundle,
    LawyerDashboardExecutionCreateBundle,
    LawyerDashboardNewCaseBundle,
    LawyerDashboardNotepadBundle,
} from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';
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
        archiveExecution,
        restoreArchivedExecution,
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
        archiveExecution,
        restoreArchivedExecution,
        permanentlyDeleteExecutions,
        moveLawsuitToTrash,
        restoreLawsuitFromTrash,
        archiveLawsuit,
        restoreArchivedLawsuit,
        permanentlyDeleteLawsuits,
    };
}

export function pickLawyerDashboardNotepadBundle(
    workspace: Workspace,
    notepad: {
        isNotepadOpen: boolean;
        notepadMode: 'list' | 'create';
        notepadFocusNoteId?: string;
        notepadSessionKey: number;
        repositoryTab: 'notepad' | 'vault';
        vaultOpenScanner: boolean;
        closeNotepad: () => void;
    },
): LawyerDashboardNotepadBundle {
    return {
        isNotepadOpen: notepad.isNotepadOpen,
        notepadMode: notepad.notepadMode,
        notepadFocusNoteId: notepad.notepadFocusNoteId,
        notepadSessionKey: notepad.notepadSessionKey,
        repositoryTab: notepad.repositoryTab,
        vaultOpenScanner: notepad.vaultOpenScanner,
        closeNotepad: notepad.closeNotepad,
        handleSaveNote: workspace.handleSaveNote,
        handleDeleteNote: workspace.handleDeleteNote,
        handleNotepadConvert: workspace.handleNotepadConvert,
    };
}

export function pickLawyerDashboardNewCaseBundle(workspace: Workspace): LawyerDashboardNewCaseBundle {
    const {
        isNewCaseModalOpen,
        openNormalNewCaseModal,
        closeNewCaseModal,
        newCaseModalKey,
        presetSelectedType,
        isCriminalSeveranceRedirect,
        onNewCaseOpenCriminalDashboard,
        handleNewCaseSave,
    } = workspace;

    return {
        isNewCaseModalOpen,
        openNormalNewCaseModal,
        closeNewCaseModal,
        newCaseModalKey,
        newCasePresetType: presetSelectedType,
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

export function pickLawyerDashboardWorkspaceOverlayBundles(
    workspace: Workspace,
    notepadShell: Parameters<typeof pickLawyerDashboardNotepadBundle>[1],
) {
    return {
        dossier: pickLawyerDashboardDossierBundle(workspace),
        archive: pickLawyerDashboardArchiveBundle(workspace),
        notepad: pickLawyerDashboardNotepadBundle(workspace, notepadShell),
        newCase: pickLawyerDashboardNewCaseBundle(workspace),
        executionCreate: pickLawyerDashboardExecutionCreateBundle(workspace),
    };
}
