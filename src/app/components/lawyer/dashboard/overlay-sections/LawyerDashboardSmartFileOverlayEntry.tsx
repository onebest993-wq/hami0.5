import React, { Suspense, useCallback, useRef } from 'react';

import type { FileData } from '@/app/components/lawyer/LawyerShared';

import { SmartFileModalBootChrome } from '@/app/components/lawyer/dashboard/SmartFileModalBootChrome';

import { LazySmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';

import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'dossier' | 'overlays' | 'newCase' | 'nav' | 'archive'
>;

/**
 * إضبارة الدعوى (SmartFile) — المخزن يبقى ظاهراً حتى يُرسم المودال؛
 * keep-alive عبر آخر ملف حتى لا يُعاد تحميل الشجرة عند كل عودة.
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
    const heldFileRef = useRef<FileData | null>(null);
    if (lawsuitFile) heldFileRef.current = lawsuitFile;
    const displayFile = lawsuitFile ?? heldFileRef.current;
    const surfaceActive = Boolean(lawsuitFile);

    const { returnFromLawsuitDossier, exitToHomeDashboard } = overlays;
    const handleCloseDossier = useCallback(() => {
        if (caseLinkViewOnly) {
            returnFromCaseLinkBrowse?.();
            return;
        }

        clearCaseLinkBrowse?.();
        returnFromLawsuitDossier?.();
        setActiveFile(null);
    }, [
        caseLinkViewOnly,
        returnFromCaseLinkBrowse,
        clearCaseLinkBrowse,
        returnFromLawsuitDossier,
        setActiveFile,
    ]);

    const hideVaultAfterPaint = useCallback(() => {
        if (!overlays.showLawsuitsWorkspace) return;
        overlays.setShowLawsuitsWorkspace(false);
    }, [overlays]);

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

    if (!displayFile) return null;

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

    const portal = (
        <LazySmartFileModalPortal
            file={displayFile}
            surfaceActive={surfaceActive}
            coverWhilePending={!overlays.showLawsuitsWorkspace}
            onPainted={hideVaultAfterPaint}
            onClose={handleCloseDossier}
            onExitToProfile={exitToHomeDashboard}
            onUpdate={(file) => {
                if (caseLinkViewOnly) return;
                const nextFile = file as unknown as FileData;
                handleUpdateFile(file as unknown as Parameters<typeof handleUpdateFile>[0]);
                maybeArchiveVoidedLawsuit(nextFile, displayFile);
            }}
            onDelete={() => {
                if (caseLinkViewOnly) return;
                handleDeleteFile(displayFile);
            }}
            theme={shell.theme}
            shapeClass={shell.shapeClass}
            onAddStage={() => {
                if (caseLinkViewOnly) return;
                initiateSubFile(displayFile);
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
    );

    return (
        <Suspense
            fallback={
                overlays.showLawsuitsWorkspace ? null : (
                    <SmartFileModalBootChrome file={displayFile} onClose={handleCloseDossier} />
                )
            }
        >
            {portal}
        </Suspense>
    );
}
