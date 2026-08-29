import type { ModalStates } from '@/app/stores/executionDashboardStore';

export function bindExecutionDashboardBootModalAliases(
    modals: ModalStates,
    setExecutionModal: (key: keyof ModalStates, show: boolean) => void,
) {
    return {
        showNotesModal: modals.showNotesModal,
        setShowNotesModal: (show: boolean) => setExecutionModal('showNotesModal', show),
        showAppointmentModal: modals.showAppointmentModal,
        setShowAppointmentModal: (show: boolean) => setExecutionModal('showAppointmentModal', show),
        showDocumentsModal: modals.showDocumentsModal,
        setShowDocumentsModal: (show: boolean) => setExecutionModal('showDocumentsModal', show),
        showDecisionsModal: modals.showDecisionsModal,
        setShowDecisionsModal: (show: boolean) => setExecutionModal('showDecisionsModal', show),
        showSeizedAssetsModal: modals.showSeizedAssetsModal,
        setShowSeizedAssetsModal: (show: boolean) => setExecutionModal('showSeizedAssetsModal', show),
        showTimelineModal: modals.showTimelineModal,
        setShowTimelineModal: (show: boolean) => setExecutionModal('showTimelineModal', show),
        showPaymentModal: modals.showPaymentModal,
        setShowPaymentModal: (show: boolean) => setExecutionModal('showPaymentModal', show),
        showNotificationModal: modals.showNotificationModal,
        setShowNotificationModal: (show: boolean) => setExecutionModal('showNotificationModal', show),
        showCoerciveModal: modals.showCoerciveModal,
        setShowCoerciveModal: (show: boolean) => setExecutionModal('showCoerciveModal', show),
        showPaymentCalculator: modals.showPaymentCalculator,
        setShowPaymentCalculator: (show: boolean) => setExecutionModal('showPaymentCalculator', show),
        showSettlementCalculator: modals.showSettlementCalculator,
        setShowSettlementCalculator: (show: boolean) => setExecutionModal('showSettlementCalculator', show),
        showPauseModal: modals.showPauseModal,
        setShowPauseModal: (show: boolean) => setExecutionModal('showPauseModal', show),
    };
}
