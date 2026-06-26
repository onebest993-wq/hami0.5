import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

import { prefetchExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';
import { prefetchExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';

import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

/** بوابة lazy — جسم الإضبارة + shell overlays يُحمَّلان معاً */
export function useExecutionDashboardLazyChunkGates(
    modals: ExecutionShellOverlayModalFlags,
    chunkDataReady = true,
) {
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
                    modals.showAppointmentModal ||
                    modals.showEditDossierMetaModal ||
                    modals.showLedgerModal ||
                    modals.showPauseModal ||
                    modals.showPaymentCalculator ||
                    modals.showSettlementCalculator,
            ),
        [modals],
    );

    const [phoneBodyReadyDeferred, setPhoneBodyReady] = useState(false);
    const [shellOverlaysReadyDeferred, setShellOverlaysReady] = useState(false);

    const phoneBodyReady = overlayUrgent || phoneBodyReadyDeferred;
    const shellOverlaysReady = overlayUrgent || shellOverlaysReadyDeferred;

    useEffect(() => {
        if (overlayUrgent) {
            setPhoneBodyReady(true);
            setShellOverlaysReady(true);
        }
    }, [overlayUrgent]);

    useLayoutEffect(() => {
        if (!chunkDataReady) return;

        prefetchExecutionDashboardPhoneBody();
        prefetchExecutionDashboardShellOverlays();
        setPhoneBodyReady(true);
        setShellOverlaysReady(true);
    }, [chunkDataReady]);

    useLayoutEffect(() => {
        if (!shellOverlaysReadyDeferred && overlayUrgent) {
            prefetchExecutionDashboardShellOverlays();
        }
    }, [overlayUrgent, shellOverlaysReadyDeferred]);

    return { phoneBodyReady, shellOverlaysReady, overlayUrgent };
}
