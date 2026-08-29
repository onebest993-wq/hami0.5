import { useEffect, useMemo } from 'react';

import { prefetchExecutionFollowupOverlay } from '../executionDashboardOverlayPrefetch';
import { prefetchExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';

import {
    isExecutionAnyOverlayUrgent,
    isExecutionOtherShellOverlayUrgent,
    type ExecutionShellOverlayModalFlags,
} from './executionShellOverlayModalFlags';

/** بوابة lazy — الجسم فوري عند جاهزية البيانات؛ overlays عند نية نافذة فقط. */
export function useExecutionDashboardLazyChunkGates(
    modals: ExecutionShellOverlayModalFlags,
    chunkDataReady = true,
    overlayIntentUrgent = false,
) {
    const overlayUrgent = useMemo(
        () => isExecutionAnyOverlayUrgent(modals) || overlayIntentUrgent,
        [modals, overlayIntentUrgent],
    );
    const shellOverlaysReady = useMemo(
        () => isExecutionOtherShellOverlayUrgent(modals) || overlayIntentUrgent,
        [modals, overlayIntentUrgent],
    );

    const phoneBodyReady = overlayUrgent || chunkDataReady;

    useEffect(() => {
        if (!modals.showUnifiedExecutionModal) return;
        prefetchExecutionFollowupOverlay();
    }, [modals.showUnifiedExecutionModal]);

    useEffect(() => {
        if (!shellOverlaysReady) return;
        prefetchExecutionDashboardShellOverlays();
        if (
            modals.showEvictionExpenseModal ||
            modals.showEvictionLawyerFeeModal ||
            modals.showEvictionResidentialGraceModal
        ) {
            void import('../executionEvictionFollowupLazy')
                .then((m) => m.prefetchEvictionFollowupSurfaces())
                .catch(() => undefined);
        }
    }, [
        shellOverlaysReady,
        modals.showEvictionExpenseModal,
        modals.showEvictionLawyerFeeModal,
        modals.showEvictionResidentialGraceModal,
    ]);

    return { phoneBodyReady, shellOverlaysReady, overlayUrgent };
}
