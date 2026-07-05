// @ts-nocheck
import React, { Suspense, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ConsolidationNavBar } from '@/app/components/lawyer/smart-modal/parts/ConsolidationNavBar';
import { LazyClientRequestsHub } from '@/app/utils/lazyComponents';
import { ArchivePortalHost } from '@/app/components/lawyer/dashboard/ArchivePortalHost';
import { ExecutionArchiveOverlayHost } from '@/app/components/lawyer/dashboard/ExecutionArchiveOverlayHost';
import { LawsuitsWorkspaceHost } from '@/app/components/lawyer/dashboard/LawsuitsWorkspaceHost';
import { SmartFileModalPortal } from '@/app/components/lawyer/dashboard/SmartFileModalPortal';
import { LawyerNewCasePortal } from '@/app/components/lawyer/dashboard/LawyerNewCasePortal';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import {
    lawyerOverlayToArchivePortalType,
    resolveOpenableFileData,
    isRecord,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';
import {
    LAWYER_LAZY_FALLBACK,
} from '@/app/components/lawyer/LawyerDashboardParts/constants';
import { ExecutionDashboardPortal } from '@/app/components/lawyer/dashboard/ExecutionDashboardPortal';
import { ExecutionCreationPortal } from '@/app/components/lawyer/dashboard/ExecutionCreationPortal';
import { prefetchExecutionCreationView } from '@/app/utils/lazyComponents';
import { useLawyerExecutionOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';
export function LawyerDashboardCaseOverlays({
    shell,
    data,
    overlays,
    criminalBridge,
    dossier,
    archive,
    newCase,
    executionCreate,
    nav,
}: Pick<
    LawyerDashboardOverlaysHostProps,
    | 'shell'
    | 'data'
    | 'overlays'
    | 'criminalBridge'
    | 'dossier'
    | 'archive'
    | 'newCase'
    | 'executionCreate'
    | 'nav'
>) {
    const { shapeClass, theme } = shell;
    const { files, executionFiles, executionFilesHydrating, criminalCasesForCluster } = data;
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
    } = dossier;
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
    } = archive;
    const {
        isNewCaseModalOpen,
        openNormalNewCaseModal,
        closeNewCaseModal,
        newCaseModalKey,
        newCasePresetType,
        isCriminalSeveranceRedirect,
        onNewCaseOpenCriminalDashboard,
        handleNewCaseSave,
    } = newCase;
    const { isExecutionModalOpen, setIsExecutionModalOpen, handleAddExecutionFile } = executionCreate;
    const { refreshAppAlerts } = nav;
    const {
        showLawsuitsWorkspace,
        setShowLawsuitsWorkspace,
        lawsuitsWorkspaceTab,
        lawsuitsDossierSection,
        urgentFocusCaseId,
        setUrgentFocusCaseId,
        openCriminalCase,
    } = overlays;

    const closeArchive = useCallback(() => setArchiveType(null), [setArchiveType]);
    const closeExecutionFile = useCallback(() => setActiveFile(null), [setActiveFile]);
    const closeExecutionCreate = useCallback(() => {
        setIsExecutionModalOpen(false);
    }, [setIsExecutionModalOpen]);
    const closeLawsuitsWorkspace = useCallback(() => {
        setShowLawsuitsWorkspace(false);
        setUrgentFocusCaseId(undefined);
    }, [setShowLawsuitsWorkspace, setUrgentFocusCaseId]);
    const onNewCaseOpenCriminalDashboardFromHub = useCallback(
        (caseId: string) => {
            onNewCaseOpenCriminalDashboard(caseId);
            if (showLawsuitsWorkspace) {
                closeLawsuitsWorkspace();
            }
        },
        [onNewCaseOpenCriminalDashboard, showLawsuitsWorkspace, closeLawsuitsWorkspace],
    );
    const handleNewCaseSaveFromHub = useCallback(
        (data: unknown) => {
            closeLawsuitsWorkspace();
            handleNewCaseSave(data);
        },
        [handleNewCaseSave, closeLawsuitsWorkspace],
    );
    const executionArchiveOpen = Boolean(archiveType && archiveType !== 'client_requests');
    const executionFileOpen = Boolean(activeFile?.type === 'execution');

    useLawyerExecutionOverlayEscape({
        archiveOpen: executionArchiveOpen,
        executionFileOpen,
        executionCreateOpen: isExecutionModalOpen,
        onCloseArchive: closeArchive,
        onCloseExecutionFile: closeExecutionFile,
        onCloseExecutionCreate: closeExecutionCreate,
    });

    useEffect(() => {
        if (activeFile && showLawsuitsWorkspace) {
            closeLawsuitsWorkspace();
        }
    }, [activeFile, showLawsuitsWorkspace, closeLawsuitsWorkspace]);

    return (
        <>
            {activeFile ? (
                activeFile.type === 'execution' ? (
                    <ExecutionDashboardPortal
                        file={activeFile}
                        onClose={closeExecutionFile}
                        onUpdate={handleUpdateExecutionFile}
                    />
                ) : (
                    <SmartFileModalPortal
                        file={activeFile}
                        onClose={() => setActiveFile(null)}
                        onUpdate={handleUpdateFile}
                        onDelete={() => handleDeleteFile(activeFile as FileData)}
                        theme={theme}
                        shapeClass={shapeClass}
                        onAddStage={initiateSubFile}
                        onAddAlert={() => void refreshAppAlerts()}
                        onSpawnLinkedIncidentalCase={handleSpawnLinkedIncidentalCase}
                        onOpenLinkedFile={handleOpenLinkedFile}
                        lawsuitFiles={files}
                        onStartConsolidationNewCase={handleStartConsolidationNewCase}
                        onConsolidateWithExisting={handleConsolidateWithExisting}
                        onLinkWithExistingCase={handleLinkWithExistingCase}
                        consolidationNavActive={consolidationNavActive && !isNewCaseModalOpen}
                        caseLinkNavActive={Boolean(caseLinkNav) && !consolidationNavActive}
                    />
                )
            ) : null}

            {archiveType === 'client_requests' ? (
                <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                    <LazyClientRequestsHub
                        onClose={() => setArchiveType(null)}
                        onConvertToCase={() => {
                            setArchiveType(null);
                            openNormalNewCaseModal();
                        }}
                    />
                </Suspense>
            ) : archiveType === 'execution' ? (
                <ExecutionArchiveOverlayHost
                    files={executionFiles}
                    lawsuitFilesForCluster={files.filter((f) => f.status !== 'deleted')}
                    theme={theme as ThemeConfig}
                    shapeClass={shapeClass}
                    executionFilesHydrating={Boolean(executionFilesHydrating)}
                    onClose={closeArchive}
                    onFileClick={(f: unknown) => {
                        if (isRecord(f) && f.type === 'execution') {
                            openArchiveFile(f);
                        }
                    }}
                    onAddAction={() => {
                        prefetchExecutionCreationView();
                        setIsExecutionModalOpen(true);
                    }}
                    onMoveExecutionToTrash={moveExecutionToTrash}
                    onRestoreExecutionFromTrash={restoreExecutionFromTrash}
                    onArchiveExecution={archiveExecution}
                    onRestoreArchivedExecution={restoreArchivedExecution}
                    onPermanentlyDeleteExecutions={permanentlyDeleteExecutions}
                />
            ) : archiveType ? (
                <ArchivePortalHost
                    type={lawyerOverlayToArchivePortalType(archiveType)}
                        files={
                            archiveType === 'execution'
                                ? executionFiles
                                : archiveType === 'deleted'
                                  ? files.filter((f) => f.status === 'deleted')
                                  : files.filter((f) => f.status !== 'deleted')
                        }
                        theme={theme as ThemeConfig}
                        shapeClass={shapeClass}
                        onClose={closeArchive}
                        onFileClick={(f: unknown) => {
                            if (isRecord(f) && f.type === 'execution') {
                                openArchiveFile(f);
                                return;
                            }
                            const resolved = resolveOpenableFileData(f, files);
                            if (!resolved) {
                                SmartToast.error('تعذّر فتح الإضبارة — تحقق من بيانات الملف');
                                return;
                            }
                            if (archiveType === 'deleted') {
                                handleRestoreFile(resolved);
                            } else if (openArchiveFile(resolved)) {
                                setArchiveType(null);
                            }
                        }}
                        onAddAction={() => {
                            if (archiveType === 'execution') {
                                prefetchExecutionCreationView();
                                setIsExecutionModalOpen(true);
                            } else {
                                openNormalNewCaseModal();
                                setArchiveType(null);
                            }
                        }}
                        lawsuitFilesForCluster={
                            archiveType === 'execution'
                                ? files.filter((f) => f.status !== 'deleted')
                                : undefined
                        }
                        onMoveExecutionToTrash={
                            archiveType === 'execution' ? moveExecutionToTrash : undefined
                        }
                        onRestoreExecutionFromTrash={
                            archiveType === 'execution' ? restoreExecutionFromTrash : undefined
                        }
                        onArchiveExecution={
                            archiveType === 'execution' ? archiveExecution : undefined
                        }
                        onRestoreArchivedExecution={
                            archiveType === 'execution' ? restoreArchivedExecution : undefined
                        }
                        onPermanentlyDeleteExecutions={
                            archiveType === 'execution' ? permanentlyDeleteExecutions : undefined
                        }
                        executionFilesHydrating={
                            archiveType === 'execution' ? Boolean(executionFilesHydrating) : false
                        }
                    />
            ) : null}

            {showLawsuitsWorkspace ? (
                <LawsuitsWorkspaceHost
                        key="lawsuits-workspace"
                        files={files as FileData[]}
                        criminalCases={criminalCasesForCluster}
                        theme={theme as ThemeConfig}
                        shapeClass={shapeClass}
                        defaultTab={lawsuitsWorkspaceTab}
                        urgentFocusCaseId={urgentFocusCaseId}
                        initialDossierSection={lawsuitsDossierSection}
                        onClose={closeLawsuitsWorkspace}
                        onOpenCriminalCase={(id: string) => {
                            openCriminalCase(id, { fromLawsuitsWorkspace: true });
                        }}
                        onDeleteCriminalCase={(id: string) => criminalBridge.deleteCriminalCase(id)}
                        onOpenFile={(f: unknown) => {
                            if (openArchiveFile(f)) {
                                closeLawsuitsWorkspace();
                            }
                        }}
                        onAddNewCase={() => {
                            openNormalNewCaseModal();
                        }}
                        onMoveLawsuitToTrash={moveLawsuitToTrash}
                        onRestoreLawsuitFromTrash={restoreLawsuitFromTrash}
                        onArchiveLawsuit={archiveLawsuit}
                        onRestoreArchivedLawsuit={restoreArchivedLawsuit}
                        onPermanentlyDeleteLawsuits={permanentlyDeleteLawsuits}
                    />
            ) : null}

            <AnimatePresence>
                {consolidationSpawnNav ? (
                    <ConsolidationNavBar
                        key="consolidation-nav"
                        primaryCaseNo={consolidationSpawnNav.primaryCaseNo}
                        secondaryLabel="الدعوى الثانية (جديدة)"
                        activeView={consolidationSpawnNav.activeView}
                        onSelectPrimary={consolidationSpawnNav.onSelectPrimary}
                        onSelectSecondary={consolidationSpawnNav.onSelectSecondary}
                    />
                ) : caseLinkNav ? (
                    <ConsolidationNavBar
                        key="case-link-nav"
                        primaryCaseNo={caseLinkNav.first.caseNo}
                        secondaryLabel={`الدعوى المربوطة (${caseLinkNav.second.caseNo})`}
                        activeView={
                            activeFile && activeFile.id === caseLinkNav.second.id ? 'secondary' : 'primary'
                        }
                        onSelectPrimary={() => setActiveFile(caseLinkNav.first)}
                        onSelectSecondary={() => setActiveFile(caseLinkNav.second)}
                    />
                ) : null}

                {isExecutionModalOpen ? (
                    <ExecutionCreationPortal
                        key="execution-create"
                        isOpen={isExecutionModalOpen}
                        onClose={() => {
                            setIsExecutionModalOpen(false);
                            setArchiveType(null);
                        }}
                        onSave={handleAddExecutionFile}
                    />
                ) : null}

                {isNewCaseModalOpen ? (
                    <LawyerNewCasePortal
                        key={newCaseModalKey}
                        isOpen={isNewCaseModalOpen}
                        presetSelectedType={newCasePresetType}
                        criminalSeveranceFormMode={isCriminalSeveranceRedirect}
                        consolidationNavActive={consolidationNavActive}
                        onClose={closeNewCaseModal}
                        onOpenCriminalDashboard={onNewCaseOpenCriminalDashboardFromHub}
                        onSave={handleNewCaseSaveFromHub}
                    />
                ) : null}
            </AnimatePresence>
        </>
    );
}
