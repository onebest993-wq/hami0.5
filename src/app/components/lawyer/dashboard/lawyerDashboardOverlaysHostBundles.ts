import type React from 'react';
import type { ExecutionFile as DashboardExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LawyerDashboardMergedOverlaysState } from '@/app/hooks/lawyerDashboard/lawyerDashboardMergedOverlaysState';
import type { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import type { GlobalSearchNavigate } from '@/app/services/globalSearchIndex';
import type { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';

type OverlayState = LawyerDashboardMergedOverlaysState;
type CriminalBridge = ReturnType<typeof useCriminalDashboardBridge>;
type Workspace = ReturnType<typeof useLawyerDashboardWorkspace>;

export type LawyerDashboardShellBundle = {
    onLogout: () => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
    onNavigateToCase?: (caseId: string) => void;
    userId: string;
    authUserId?: string;
    shapeClass: string;
    theme: { bg: string; [key: string]: unknown };
    lawyerShellAccess: boolean;
};

export type LawyerDashboardDataBundle = {
    files: Workspace['files'];
    executionFiles: DashboardExecutionFile[];
    executionFilesHydrating?: boolean;
    globalNotes: Workspace['globalNotes'];
    searchNotifications: Array<{ id: string; title: string; message: string; type: string }>;
    criminalCasesForCluster: unknown[];
};

export type LawyerDashboardDossierBundle = {
    activeFile: Workspace['activeFile'];
    setActiveFile: Workspace['setActiveFile'];
    handleUpdateFile: Workspace['handleUpdateFile'];
    handleUpdateExecutionFile: Workspace['handleUpdateExecutionFile'];
    handleDeleteFile: Workspace['handleDeleteFile'];
    initiateSubFile: Workspace['initiateSubFile'];
    handleSpawnLinkedIncidentalCase: Workspace['handleSpawnLinkedIncidentalCase'];
    handleOpenLinkedFile: Workspace['handleOpenLinkedFile'];
    handleStartConsolidationNewCase: Workspace['handleStartConsolidationNewCase'];
    handleConsolidateWithExisting: Workspace['handleConsolidateWithExisting'];
    handleLinkWithExistingCase: Workspace['handleLinkWithExistingCase'];
    consolidationNavActive: Workspace['consolidationNavActive'];
    caseLinkNav: Workspace['caseLinkNav'];
    consolidationSpawnNav: Workspace['consolidationSpawnNav'];
};

export type LawyerDashboardArchiveBundle = {
    archiveType: LawyerArchiveOverlay;
    setArchiveType: React.Dispatch<React.SetStateAction<LawyerArchiveOverlay>>;
    openArchiveFile: Workspace['openArchiveFile'];
    handleRestoreFile: Workspace['handleRestoreFile'];
    moveExecutionToTrash: Workspace['moveExecutionToTrash'];
    restoreExecutionFromTrash: Workspace['restoreExecutionFromTrash'];
    archiveExecution: Workspace['archiveExecution'];
    restoreArchivedExecution: Workspace['restoreArchivedExecution'];
    permanentlyDeleteExecutions: Workspace['permanentlyDeleteExecutions'];
    moveLawsuitToTrash: Workspace['moveLawsuitToTrash'];
    restoreLawsuitFromTrash: Workspace['restoreLawsuitFromTrash'];
    archiveLawsuit: Workspace['archiveLawsuit'];
    restoreArchivedLawsuit: Workspace['restoreArchivedLawsuit'];
    permanentlyDeleteLawsuits: Workspace['permanentlyDeleteLawsuits'];
};

export type LawyerDashboardNotepadBundle = {
    isNotepadOpen: boolean;
    notepadMode: 'list' | 'create';
    notepadFocusNoteId: string | undefined;
    notepadSessionKey: number;
    repositoryTab: 'notepad' | 'vault';
    vaultOpenScanner: boolean;
    closeNotepad: () => void;
    handleSaveNote: Workspace['handleSaveNote'];
    handleDeleteNote: Workspace['handleDeleteNote'];
    handleNotepadConvert: Workspace['handleNotepadConvert'];
};

export type LawyerDashboardNewCaseBundle = {
    isNewCaseModalOpen: boolean;
    openNormalNewCaseModal: Workspace['openNormalNewCaseModal'];
    closeNewCaseModal: Workspace['closeNewCaseModal'];
    newCaseModalKey: Workspace['newCaseModalKey'];
    newCasePresetType: Workspace['presetSelectedType'];
    isCriminalSeveranceRedirect: Workspace['isCriminalSeveranceRedirect'];
    onNewCaseOpenCriminalDashboard: Workspace['onNewCaseOpenCriminalDashboard'];
    handleNewCaseSave: Workspace['handleNewCaseSave'];
};

export type LawyerDashboardExecutionCreateBundle = {
    isExecutionModalOpen: boolean;
    setIsExecutionModalOpen: Workspace['setIsExecutionModalOpen'];
    handleAddExecutionFile: Workspace['handleAddExecutionFile'];
};

export type LawyerDashboardNavBundle = {
    setActiveTab: OverlayState['setActiveTab'];
    refreshAppAlerts: () => void;
    handleGlobalSearchNavigate: (navigate: GlobalSearchNavigate) => void;
    closeGlobalSearch: () => void;
};

export type LawyerDashboardOverlaysHostProps = {
    shell: LawyerDashboardShellBundle;
    data: LawyerDashboardDataBundle;
    overlays: OverlayState;
    criminalBridge: CriminalBridge;
    dossier: LawyerDashboardDossierBundle;
    archive: LawyerDashboardArchiveBundle;
    notepad: LawyerDashboardNotepadBundle;
    newCase: LawyerDashboardNewCaseBundle;
    executionCreate: LawyerDashboardExecutionCreateBundle;
    nav: LawyerDashboardNavBundle;
};
