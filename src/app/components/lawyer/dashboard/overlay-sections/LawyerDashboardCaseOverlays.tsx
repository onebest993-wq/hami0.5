// @ts-nocheck
import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ConsolidationNavBar } from '@/app/components/lawyer/smart-modal/parts/ConsolidationNavBar';
import { ArchivePortal } from '@/app/components/lawyer/ArchivePortal';
import {
    LazyClientRequestsHub,
    LazyExecutionCreationView,
    LazyExecutionDashboard,
    LazyLawsuitsWorkspace,
    LazySmartFileModal,
} from '@/app/utils/lazyComponents';
import { LazyLawyerNewCase } from '@/app/utils/lazy/lawyerNewCaseModal';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ThemeConfig } from '@/app/types/common';
import {
    lawyerOverlayToArchivePortalType,
    resolveOpenableFileData,
    isRecord,
} from '@/app/components/lawyer/LawyerDashboardParts/utils';
import DossierOpeningFallbackComponent from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import { LAWYER_LAZY_FALLBACK } from '@/app/components/lawyer/LawyerDashboardParts/constants';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

const DOSSIER_OPENING_FALLBACK = <DossierOpeningFallbackComponent />;

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
    const { files, executionFiles, criminalCasesForCluster } = data;
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
        openCriminalCase,
    } = overlays;

    return (
        <>
            {activeFile && (
                <Suspense fallback={DOSSIER_OPENING_FALLBACK}>
                    {activeFile.type === 'execution' ? (
                        <LazyExecutionDashboard
                            key={`exec-${activeFile.id}`}
                            file={activeFile}
                            onClose={() => setActiveFile(null)}
                            onUpdate={handleUpdateExecutionFile}
                        />
                    ) : (
                        <LazySmartFileModal
                            key={`lawsuit-${activeFile.id}`}
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
                    )}
                </Suspense>
            )}

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
            ) : (
                archiveType && (
                    <ArchivePortal
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
                        onClose={() => setArchiveType(null)}
                        onFileClick={(f: unknown) => {
                            if (isRecord(f) && f.type === 'execution') {
                                if (openArchiveFile(f)) setArchiveType(null);
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
                        onPermanentlyDeleteExecutions={
                            archiveType === 'execution' ? permanentlyDeleteExecutions : undefined
                        }
                    />
                )
            )}

            <AnimatePresence>
                {showLawsuitsWorkspace && (
                    <Suspense key="lawsuits-workspace" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLawsuitsWorkspace
                            files={files as FileData[]}
                            criminalCases={criminalCasesForCluster}
                            theme={theme as ThemeConfig}
                            shapeClass={shapeClass}
                            defaultTab={lawsuitsWorkspaceTab}
                            initialDossierSection={lawsuitsDossierSection}
                            onClose={() => setShowLawsuitsWorkspace(false)}
                            onOpenCriminalCase={(id: string) => {
                                openCriminalCase(id, { fromLawsuitsWorkspace: true });
                            }}
                            onDeleteCriminalCase={(id: string) => criminalBridge.deleteCriminalCase(id)}
                            onOpenFile={(f: unknown) => {
                                if (openArchiveFile(f)) {
                                    setShowLawsuitsWorkspace(false);
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
                    </Suspense>
                )}
            </AnimatePresence>

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

                {isExecutionModalOpen && (
                    <Suspense key="execution-create" fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyExecutionCreationView
                            isOpen={isExecutionModalOpen}
                            onClose={() => {
                                setIsExecutionModalOpen(false);
                                setArchiveType(null);
                            }}
                            onSave={handleAddExecutionFile}
                        />
                    </Suspense>
                )}

                {isNewCaseModalOpen ? (
                    <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                        <LazyLawyerNewCase
                            key={newCaseModalKey}
                            isOpen={isNewCaseModalOpen}
                            presetSelectedType={newCasePresetType}
                            criminalSeveranceFormMode={isCriminalSeveranceRedirect}
                            consolidationNavActive={consolidationNavActive}
                            onClose={closeNewCaseModal}
                            onOpenCriminalDashboard={onNewCaseOpenCriminalDashboard}
                            onSave={handleNewCaseSave}
                        />
                    </Suspense>
                ) : null}
            </AnimatePresence>
        </>
    );
}
