import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

export type ExecutionShellOverlayModalFlags = {
    showUnifiedExecutionModal?: boolean;
    showDecisionsModal?: boolean;
    showDocumentsModal?: boolean;
    showTimelineModal?: boolean;
    showCoerciveModal?: boolean;
    showNotificationModal?: boolean;
    showUnifiedSummonsModal?: boolean;
    showPaymentModal?: boolean;
    showSeizedAssetsModal?: boolean;
    showNotesModal?: boolean;
    showAppointmentModal?: boolean;
    showEditDossierMetaModal?: boolean;
    showLedgerModal?: boolean;
    showPauseModal?: boolean;
    showPaymentCalculator?: boolean;
    showSettlementCalculator?: boolean;
};

/** يؤجّل تركيب overlays حتى idle — أو فوراً عند فتح modal */
export function useExecutionShellOverlaysGate(modals: ExecutionShellOverlayModalFlags) {
    const overlayUrgent = useMemo(
        () =>
            Boolean(
                modals.showUnifiedExecutionModal ||
                    modals.showDecisionsModal ||
                    modals.showDocumentsModal ||
                    modals.showTimelineModal ||
                    modals.showCoerciveModal ||
                    modals.showNotificationModal ||
                    modals.showUnifiedSummonsModal ||
                    modals.showPaymentModal ||
                    modals.showSeizedAssetsModal ||
                    modals.showNotesModal ||
                    modals.showAppointmentModal,
            ),
        [modals],
    );

    const [shellOverlaysReady, setShellOverlaysReady] = useState(false);

    useEffect(() => {
        if (overlayUrgent) setShellOverlaysReady(true);
    }, [overlayUrgent]);

    useEffect(() => {
        return scheduleIdleWork(() => setShellOverlaysReady(true), 500);
    }, []);

    return { shellOverlaysReady, overlayUrgent };
}
