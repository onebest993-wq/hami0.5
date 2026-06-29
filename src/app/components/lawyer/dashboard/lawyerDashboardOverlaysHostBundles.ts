// @ts-nocheck
import type React from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LawyerDashboardMergedOverlaysState } from '@/app/hooks/lawyerDashboard/lawyerDashboardMergedOverlaysState';
import type { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import type { LazyGlobalSearchOverlay } from '@/app/utils/lazyComponents';

type OverlayState = LawyerDashboardMergedOverlaysState;
type CriminalBridge = ReturnType<typeof useCriminalDashboardBridge>;

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
    files: FileData[];
    executionFiles: ExecutionFile[];
    executionFilesHydrating?: boolean;
    globalNotes: GlobalNote[];
    searchNotifications: Array<{ id: string; title: string; message: string; type: string }>;
    criminalCasesForCluster: unknown[];
};

export type LawyerDashboardDossierBundle = {
    activeFile: FileData | ExecutionFile | null;
    setActiveFile: React.Dispatch<React.SetStateAction<FileData | ExecutionFile | null>>;
    handleUpdateFile: (file: FileData) => void;
    handleUpdateExecutionFile: (file: ExecutionFile) => void;
    handleDeleteFile: (file: FileData) => void;
    initiateSubFile: (...args: unknown[]) => void;
    handleSpawnLinkedIncidentalCase: (...args: unknown[]) => void;
    handleOpenLinkedFile: (fileId: number) => void;
    handleStartConsolidationNewCase: (...args: unknown[]) => void;
    handleConsolidateWithExisting: (...args: unknown[]) => void;
    handleLinkWithExistingCase: (...args: unknown[]) => void;
    consolidationNavActive: boolean;
    caseLinkNav: { first: FileData; second: FileData } | null;
    consolidationSpawnNav: {
        primaryCaseNo: string;
        activeView: 'primary' | 'secondary';
        onSelectPrimary: () => void;
        onSelectSecondary: () => void;
    } | null;
};

export type LawyerDashboardArchiveBundle = {
    archiveType: LawyerArchiveOverlay;
    setArchiveType: React.Dispatch<React.SetStateAction<LawyerArchiveOverlay>>;
    openArchiveFile: (f: unknown) => boolean;
    handleRestoreFile: (file: FileData) => void;
    moveExecutionToTrash: (ids: Array<string | number>) => void;
    restoreExecutionFromTrash: (id: string | number) => void;
    archiveExecution: (id: string | number) => void;
    restoreArchivedExecution: (id: string | number) => void;
    permanentlyDeleteExecutions: (ids: Array<string | number>) => void;
    moveLawsuitToTrash: (ids: Array<string | number>) => void;
    restoreLawsuitFromTrash: (id: string | number) => void;
    archiveLawsuit: (id: string | number) => void;
    restoreArchivedLawsuit: (id: string | number) => void;
    permanentlyDeleteLawsuits: (ids: Array<string | number>) => void;
};

export type LawyerDashboardNotepadBundle = {
    isNotepadOpen: boolean;
    notepadMode: 'list' | 'create';
    notepadFocusNoteId: string | undefined;
    notepadSessionKey: number;
    repositoryTab: 'notepad' | 'vault';
    vaultOpenScanner: boolean;
    closeNotepad: () => void;
    handleSaveNote: (note: GlobalNote) => void | Promise<void>;
    handleDeleteNote: (id: number) => void;
    handleNotepadConvert: (noteId: number) => void;
};

export type LawyerDashboardNewCaseBundle = {
    isNewCaseModalOpen: boolean;
    openNormalNewCaseModal: () => void;
    closeNewCaseModal: () => void;
    newCaseModalKey: string | number;
    newCasePresetType: string | undefined;
    isCriminalSeveranceRedirect: boolean;
    onNewCaseOpenCriminalDashboard: (caseId: string) => void;
    handleNewCaseSave: (...args: unknown[]) => void;
};

export type LawyerDashboardExecutionCreateBundle = {
    isExecutionModalOpen: boolean;
    setIsExecutionModalOpen: (open: boolean) => void;
    handleAddExecutionFile: (file: Record<string, unknown>) => void;
};

export type LawyerDashboardNavBundle = {
    setActiveTab: OverlayState['setActiveTab'];
    refreshAppAlerts: () => void;
    handleGlobalSearchNavigate: (
        nav: Parameters<React.ComponentProps<typeof LazyGlobalSearchOverlay>['onNavigate']>[0],
    ) => void;
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
