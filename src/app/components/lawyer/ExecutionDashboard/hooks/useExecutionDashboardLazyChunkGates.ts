import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

import { prefetchExecutionDashboardPhoneBody } from '../executionDashboardPhoneBodyLazy';
import { prefetchExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';

import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

/** بوابة lazy — الجسم أولاً، ثم overlays لاحقاً أو فوراً عند الحاجة العاجلة. */
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
                modals.showExecutionTrashModal ||
                modals.showGuarantorDetailsModal ||
                modals.showHeirsNotificationModal ||
                    modals.showLedgerModal ||
                    modals.showPauseModal ||
                    modals.showPaymentCalculator ||
                modals.showSettlementCalculator ||
                modals.showTransferFileNumberChangeModal ||
                modals.showRealEstateSeizureModal,
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

    useEffect(() => {
        if (!chunkDataReady) return;
        const cancelPhoneBody = scheduleIdleWork(() => {
            prefetchExecutionDashboardPhoneBody();
            setPhoneBodyReady(true);
        }, 120);
        return () => {
            cancelPhoneBody();
        };
    }, [chunkDataReady]);

    useEffect(() => {
        if (!shellOverlaysReadyDeferred && overlayUrgent) {
            prefetchExecutionDashboardShellOverlays();
            setShellOverlaysReady(true);
        }
    }, [overlayUrgent, shellOverlaysReadyDeferred]);

    return { phoneBodyReady, shellOverlaysReady, overlayUrgent };
}
