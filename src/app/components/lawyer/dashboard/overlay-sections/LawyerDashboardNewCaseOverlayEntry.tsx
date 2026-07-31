import React, { useCallback } from 'react';
import { LawyerNewCasePortal } from '@/app/components/lawyer/dashboard/LawyerNewCasePortal';
import type { LawyerDashboardOverlaysBundleProps } from '@/app/components/lawyer/dashboard/lawyerDashboardOverlaysBundles';

type Props = Pick<LawyerDashboardOverlaysBundleProps, 'overlays' | 'newCase' | 'dossier'>;

/**
 * نموذج دعوى جديدة — على MainView مباشرة.
 */
export function LawyerDashboardNewCaseOverlayEntry({
    overlays,
    newCase,
    dossier,
}: Props): React.ReactElement | null {
    const {
        isNewCaseModalOpen,
        closeNewCaseModal,
        newCaseModalKey,
        newCasePresetType,
        isCriminalSeveranceRedirect,
        onNewCaseOpenCriminalDashboard,
        handleNewCaseSave,
    } = newCase;

    const closeLawsuitsWorkspace = useCallback(() => {
        overlays.setShowLawsuitsWorkspace(false);
        overlays.setUrgentFocusCaseId(undefined);
    }, [overlays]);

    const onNewCaseOpenCriminalDashboardFromHub = useCallback(
        (caseId: string) => {
            if (overlays.showLawsuitsWorkspace) {
                overlays.openCriminalCase(caseId, { fromLawsuitsWorkspace: true });
            } else {
                onNewCaseOpenCriminalDashboard(caseId);
            }
        },
        [onNewCaseOpenCriminalDashboard, overlays],
    );

    const handleNewCaseSaveFromHub = useCallback(
        async (payload: unknown) => {
            const saved = await handleNewCaseSave(payload);
            if (saved) {
                closeLawsuitsWorkspace();
            }
        },
        [handleNewCaseSave, closeLawsuitsWorkspace],
    );

    if (!isNewCaseModalOpen) return null;

    return (
        <LawyerNewCasePortal
            key={newCaseModalKey}
            isOpen={isNewCaseModalOpen}
            presetSelectedType={newCasePresetType}
            criminalSeveranceFormMode={isCriminalSeveranceRedirect}
            consolidationNavActive={dossier.consolidationNavActive}
            onClose={closeNewCaseModal}
            onOpenCriminalDashboard={onNewCaseOpenCriminalDashboardFromHub}
            onSave={handleNewCaseSaveFromHub}
        />
    );
}
