import { useEffect, useMemo, useState } from 'react';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import type { ExecutionShellOverlayModalFlags } from './useExecutionShellOverlaysGate';

/** يؤجّل تركيب جسم الداشبورد حتى idle — أو فوراً عند فتح modal عاجل */
export function useExecutionDashboardPhoneBodyGate(modals: ExecutionShellOverlayModalFlags) {
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

    const [phoneBodyReady, setPhoneBodyReady] = useState(false);

    useEffect(() => {
        if (overlayUrgent) setPhoneBodyReady(true);
    }, [overlayUrgent]);

    useEffect(() => {
        return scheduleIdleWork(() => {
            setPhoneBodyReady(true);
        }, 120);
    }, []);

    return { phoneBodyReady, overlayUrgent };
}
