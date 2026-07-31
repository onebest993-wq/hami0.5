import React, { Suspense, useEffect } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { SmartFileModalBootChrome } from '@/app/components/lawyer/dashboard/SmartFileModalBootChrome';
import { LazySmartFileModalPortal } from '@/app/components/lawyer/dashboard/smartFileModalPortalLazy';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<
    LawyerDashboardOverlaysBundleProps,
    'shell' | 'data' | 'dossier' | 'overlays' | 'newCase' | 'nav'
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
}: Props): React.ReactElement | null {
    const { activeFile, setActiveFile } = dossier;
    const lawsuitFile =
        activeFile && activeFile.type !== 'execution' ? (activeFile as FileData) : null;

    useEffect(() => {
        if (!lawsuitFile) return;
        if (overlays.showLawsuitsWorkspace) {
            overlays.setShowLawsuitsWorkspace(false);
            overlays.setUrgentFocusCaseId(undefined);
        }
    }, [lawsuitFile, overlays]);

    if (!lawsuitFile) return null;

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
        caseLinkNav,
    } = dossier;

    return (
        <Suspense
            fallback={
                <SmartFileModalBootChrome
                    file={lawsuitFile}
                    onClose={() => setActiveFile(null)}
                />
            }
        >
            <LazySmartFileModalPortal
                file={lawsuitFile}
                onClose={() => setActiveFile(null)}
                onExitToProfile={overlays.openProfileTab}
                onUpdate={(file) =>
                    handleUpdateFile(file as unknown as Parameters<typeof handleUpdateFile>[0])
                }
                onDelete={() => handleDeleteFile(lawsuitFile)}
                theme={shell.theme}
                shapeClass={shell.shapeClass}
                onAddStage={() => initiateSubFile(lawsuitFile)}
                onAddAlert={() => void nav.refreshAppAlerts()}
                onSpawnLinkedIncidentalCase={handleSpawnLinkedIncidentalCase}
                onOpenLinkedFile={handleOpenLinkedFile}
                lawsuitFiles={data.files}
                onStartConsolidationNewCase={handleStartConsolidationNewCase}
                onConsolidateWithExisting={handleConsolidateWithExisting}
                onLinkWithExistingCase={handleLinkWithExistingCase}
                consolidationNavActive={consolidationNavActive && !newCase.isNewCaseModalOpen}
                caseLinkNavActive={Boolean(caseLinkNav) && !consolidationNavActive}
            />
        </Suspense>
    );
}
