import React, { Suspense, useCallback, useLayoutEffect } from 'react';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { SmartFileModalBootChrome } from '@/app/components/lawyer/dashboard/SmartFileModalBootChrome';

import { LazySmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';

import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';



type Props = Pick<

    LawyerDashboardOverlaysBundleProps,

    'shell' | 'data' | 'dossier' | 'overlays' | 'newCase' | 'nav' | 'archive'

>;



/**

 * إضبارة الدعوى (SmartFile) — على MainView مباشرة بلا شلال Suspense مزدوج.

 * BootChrome فقط كـ fallback داخلي إن لم يكتمل preload.

 */

export function LawyerDashboardSmartFileOverlayEntry({

    shell,

    data,

    dossier,

    overlays,

    newCase,

    nav,

    archive,

}: Props): React.ReactElement | null {

    const {

        activeFile,

        setActiveFile,

        caseLinkViewOnly,

        returnFromCaseLinkBrowse,

        clearCaseLinkBrowse,

        caseLinkBrowse,

        handleUnlinkCaseLink,

    } = dossier;

    const lawsuitFile =

        activeFile && activeFile.type !== 'execution' ? (activeFile as FileData) : null;



    const handleCloseDossier = useCallback(() => {

        if (caseLinkViewOnly) {

            returnFromCaseLinkBrowse();

            return;

        }

        clearCaseLinkBrowse();

        overlays.returnFromLawsuitDossier();

        setActiveFile(null);

    }, [caseLinkViewOnly, returnFromCaseLinkBrowse, clearCaseLinkBrowse, overlays, setActiveFile]);



    const maybeArchiveVoidedLawsuit = useCallback(
        (updatedFile: FileData, previousFile: FileData) => {
            const status = String(updatedFile.status ?? '').trim();
            if (status !== 'مبطلة') return;

            const prevIdx = Number(previousFile.activeStageIndex ?? 0);
            const nextIdx = Number(updatedFile.activeStageIndex ?? 0);
            const prevStages = Array.isArray(previousFile.stages) ? previousFile.stages : [];
            const nextStages = Array.isArray(updatedFile.stages) ? updatedFile.stages : [];
            const prevStage = prevStages[prevIdx] as { isVoided?: boolean } | undefined;
            const nextStage = nextStages[nextIdx] as { isVoided?: boolean } | undefined;
            const becameVoid = Boolean(nextStage?.isVoided) && !prevStage?.isVoided;
            if (!becameVoid) return;

            archive.archiveLawsuit(updatedFile.id);
            overlays.returnFromLawsuitDossier();
        },
        [archive, overlays],
    );



    useLayoutEffect(() => {

        if (!lawsuitFile) return;

        if (overlays.showLawsuitsWorkspace) {

            overlays.markLawsuitDossierOpenedFromWorkspace();

            overlays.setShowLawsuitsWorkspace(false);

            overlays.setUrgentFocusCaseId(undefined);

        }

    }, [lawsuitFile, overlays]);



    if (!lawsuitFile) return null;

    const caseLinkBrowseMeta =
        caseLinkViewOnly && caseLinkBrowse
            ? {
                  originCaseNo: caseLinkBrowse.originCaseNo,
                  peerCaseNo: String(caseLinkBrowse.snapshot.caseNo ?? '').trim(),
                  peerFileId: Number(caseLinkBrowse.snapshot.id),
              }
            : undefined;



    const {

        handleUpdateFile,

        handleDeleteFile,

        initiateSubFile,

        handleSpawnLinkedIncidentalCase,

        handleOpenLinkedFile,

        handleStartConsolidationNewCase,

        handleConsolidateWithExisting,

        handleLinkWithExistingCase,

        consolidationNavActive,

    } = dossier;



    return (

        <Suspense

            fallback={

                <SmartFileModalBootChrome

                    file={lawsuitFile}

                    onClose={handleCloseDossier}

                />

            }

        >

            <LazySmartFileModalPortal

                file={lawsuitFile}

                onClose={handleCloseDossier}

                onExitToProfile={overlays.exitToHomeDashboard}

                onUpdate={(file) => {

                    if (caseLinkViewOnly) return;

                    const nextFile = file as unknown as FileData;

                    handleUpdateFile(file as unknown as Parameters<typeof handleUpdateFile>[0]);

                    maybeArchiveVoidedLawsuit(nextFile, lawsuitFile);

                }}

                onDelete={() => {

                    if (caseLinkViewOnly) return;

                    handleDeleteFile(lawsuitFile);

                }}

                theme={shell.theme}

                shapeClass={shell.shapeClass}

                onAddStage={() => {

                    if (caseLinkViewOnly) return;

                    initiateSubFile(lawsuitFile);

                }}

                onAddAlert={() => void nav.refreshAppAlerts()}

                onSpawnLinkedIncidentalCase={handleSpawnLinkedIncidentalCase}

                onOpenLinkedFile={caseLinkViewOnly ? undefined : handleOpenLinkedFile}

                lawsuitFiles={data.files}

                onStartConsolidationNewCase={handleStartConsolidationNewCase}

                onConsolidateWithExisting={handleConsolidateWithExisting}

                onLinkWithExistingCase={handleLinkWithExistingCase}

                consolidationNavActive={consolidationNavActive && !newCase.isNewCaseModalOpen}

                caseLinkNavActive={false}

                caseLinkViewOnly={caseLinkViewOnly}

                onReturnFromCaseLinkBrowse={returnFromCaseLinkBrowse}

                onUnlinkCaseLink={handleUnlinkCaseLink}

                caseLinkBrowseMeta={caseLinkBrowseMeta}

            />

        </Suspense>

    );

}

