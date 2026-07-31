import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

import { prefetchExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';
import { prefetchExecutionFollowupOverlay } from '../executionDashboardOverlayPrefetch';

import type { ExecutionShellOverlayModalFlags } from './executionShellOverlayModalFlags';

/** بوابة lazy — الجسم فوري عند جاهزية البيانات؛ overlays في الإطار التالي. */
export function useExecutionDashboardLazyChunkGates(
    modals: ExecutionShellOverlayModalFlags,
    chunkDataReady = true,
    overlayIntentUrgent = false,
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
            ) || overlayIntentUrgent,
        [
            modals.showUnifiedExecutionModal,
            modals.showDecisionsModal,
            modals.showDocumentsModal,
            modals.showTimelineModal,
            modals.showCoerciveModal,
            modals.showNotificationModal,
            modals.showUnifiedSummonsModal,
            modals.showPaymentModal,
            modals.showSeizedAssetsModal,
            modals.showNotesModal,
            modals.showAppointmentModal,
            modals.showEditDossierMetaModal,
            modals.showExecutionTrashModal,
            modals.showGuarantorDetailsModal,
            modals.showHeirsNotificationModal,
            modals.showLedgerModal,
            modals.showPauseModal,
            modals.showPaymentCalculator,
            modals.showSettlementCalculator,
            modals.showTransferFileNumberChangeModal,
            modals.showRealEstateSeizureModal,
            overlayIntentUrgent,
        ],
    );

    const phoneBodyReady = overlayUrgent || chunkDataReady;

    const [shellOverlaysReadyDeferred, setShellOverlaysReady] = useState(false);
    const shellOverlaysReady = overlayUrgent || shellOverlaysReadyDeferred;

    useEffect(() => {
        if (overlayUrgent) {
            prefetchExecutionFollowupOverlay();
            setShellOverlaysReady(true);
        }
    }, [overlayUrgent]);

    useEffect(() => {
        if (!chunkDataReady || overlayUrgent) return;
        if (typeof requestAnimationFrame !== 'undefined') {
            const frameId = requestAnimationFrame(() => {
                prefetchExecutionDashboardShellOverlays();
                prefetchExecutionFollowupOverlay();
                setShellOverlaysReady(true);
            });
            return () => cancelAnimationFrame(frameId);
        }
        const cancelIdle = scheduleIdleWork(() => {
            prefetchExecutionDashboardShellOverlays();
            prefetchExecutionFollowupOverlay();
            setShellOverlaysReady(true);
        }, 120);
        return cancelIdle;
    }, [chunkDataReady, overlayUrgent]);

    useEffect(() => {
        if (!shellOverlaysReadyDeferred && overlayUrgent) {
            prefetchExecutionDashboardShellOverlays();
            prefetchExecutionFollowupOverlay();
            setShellOverlaysReady(true);
        }
    }, [overlayUrgent, shellOverlaysReadyDeferred]);

    return { phoneBodyReady, shellOverlaysReady, overlayUrgent };
}
