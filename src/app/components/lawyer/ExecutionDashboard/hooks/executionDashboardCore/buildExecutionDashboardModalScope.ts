// @ts-nocheck
/** Phase C — flags/setters للنوافذ قبل dynamic scope */
import type { ModalStates } from '@/app/stores/executionDashboardStore';

export type ExecutionModalFlags = {
    showUnifiedExecutionModal: boolean;
    showDecisionsModal: boolean;
    showDocumentsModal: boolean;
    showTimelineModal: boolean;
    showCoerciveModal: boolean;
    showNotificationModal: boolean;
    showUnifiedSummonsModal: boolean;
    showPaymentModal: boolean;
    showSeizedAssetsModal: boolean;
    showNotesModal: boolean;
    showAppointmentModal: boolean;
    showPaymentCalculator: boolean;
    showSettlementCalculator: boolean;
    showPauseModal: boolean;
    showLedgerModal: boolean;
    showEditDossierMetaModal: boolean;
    showEvictionExpenseModal: boolean;
    showEvictionLawyerFeeModal: boolean;
    showEvictionResidentialGraceModal: boolean;
    showGuarantorDetailsModal: boolean;
    showHeirsNotificationModal: boolean;
    showLinkedDossierTimeline: boolean;
    showRealEstateSeizureModal: boolean;
    showSolidaryCoerciveTargetModal: boolean;
    showStayOfExecutionModal: boolean;
    showTransferFileNumberChangeModal: boolean;
};

export type ExecutionModalSetters = {
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setShowDecisionsModal: (show: boolean) => void;
    setShowDocumentsModal: (show: boolean) => void;
    setShowTimelineModal: (show: boolean) => void;
    setShowCoerciveModal: (show: boolean) => void;
    setShowNotificationModal: (show: boolean) => void;
    setShowUnifiedSummonsModal: (show: boolean) => void;
    setShowPaymentModal: (show: boolean) => void;
    setShowSeizedAssetsModal: (show: boolean) => void;
    setShowNotesModal: (show: boolean) => void;
    setShowAppointmentModal: (show: boolean) => void;
    setShowPaymentCalculator: (show: boolean) => void;
    setShowSettlementCalculator: (show: boolean) => void;
    setShowPauseModal: (show: boolean) => void;
    setShowLedgerModal: (show: boolean) => void;
    setShowEditDossierMetaModal: (show: boolean) => void;
    setShowEvictionExpenseModal: (show: boolean) => void;
    setShowEvictionLawyerFeeModal: (show: boolean) => void;
    setShowEvictionResidentialGraceModal: (show: boolean) => void;
    setShowGuarantorDetailsModal: (show: boolean) => void;
    setShowHeirsNotificationModal: (show: boolean) => void;
    setShowLinkedDossierTimeline: (show: boolean) => void;
    setShowRealEstateSeizureModal: (show: boolean) => void;
    setShowSolidaryCoerciveTargetModal: (show: boolean) => void;
    setShowStayOfExecutionModal: (show: boolean) => void;
    setShowTransferFileNumberChangeModal: (show: boolean) => void;
    setEditingNoteId: (id: string | null) => void;
};

type BuildExecutionModalScopeParams = ExecutionModalFlags &
    ExecutionModalSetters & {
        modals: ModalStates;
        setExecutionModal: (key: keyof ModalStates, show: boolean) => void;
    };

export function buildExecutionDashboardModalScope(params: BuildExecutionModalScopeParams) {
    const { modals, setExecutionModal } = params;

    const executionModalFlags: ExecutionModalFlags = {
        showUnifiedExecutionModal: params.showUnifiedExecutionModal,
        showDecisionsModal: params.showDecisionsModal,
        showDocumentsModal: params.showDocumentsModal,
        showTimelineModal: params.showTimelineModal,
        showCoerciveModal: params.showCoerciveModal,
        showNotificationModal: params.showNotificationModal,
        showUnifiedSummonsModal: params.showUnifiedSummonsModal,
        showPaymentModal: params.showPaymentModal,
        showSeizedAssetsModal: params.showSeizedAssetsModal,
        showNotesModal: params.showNotesModal,
        showAppointmentModal: params.showAppointmentModal,
        showPaymentCalculator: params.showPaymentCalculator,
        showSettlementCalculator: params.showSettlementCalculator,
        showPauseModal: params.showPauseModal,
        showLedgerModal: params.showLedgerModal,
        showEditDossierMetaModal: params.showEditDossierMetaModal,
        showEvictionExpenseModal: params.showEvictionExpenseModal,
        showEvictionLawyerFeeModal: params.showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal: params.showEvictionResidentialGraceModal,
        showGuarantorDetailsModal: params.showGuarantorDetailsModal,
        showHeirsNotificationModal: params.showHeirsNotificationModal,
        showLinkedDossierTimeline: params.showLinkedDossierTimeline,
        showRealEstateSeizureModal: params.showRealEstateSeizureModal,
        showSolidaryCoerciveTargetModal: params.showSolidaryCoerciveTargetModal,
        showStayOfExecutionModal: params.showStayOfExecutionModal,
        showTransferFileNumberChangeModal: params.showTransferFileNumberChangeModal,
    };

    const executionModalSetters: ExecutionModalSetters = {
        setShowUnifiedExecutionModal: params.setShowUnifiedExecutionModal,
        setShowDecisionsModal: params.setShowDecisionsModal,
        setShowDocumentsModal: params.setShowDocumentsModal,
        setShowTimelineModal: params.setShowTimelineModal,
        setShowCoerciveModal: params.setShowCoerciveModal,
        setShowNotificationModal: params.setShowNotificationModal,
        setShowUnifiedSummonsModal: params.setShowUnifiedSummonsModal,
        setShowPaymentModal: params.setShowPaymentModal,
        setShowSeizedAssetsModal: params.setShowSeizedAssetsModal,
        setShowNotesModal: params.setShowNotesModal,
        setShowAppointmentModal: params.setShowAppointmentModal,
        setShowPaymentCalculator: params.setShowPaymentCalculator,
        setShowSettlementCalculator: params.setShowSettlementCalculator,
        setShowPauseModal: params.setShowPauseModal,
        setShowLedgerModal: params.setShowLedgerModal,
        setShowEditDossierMetaModal: params.setShowEditDossierMetaModal,
        setShowEvictionExpenseModal: params.setShowEvictionExpenseModal,
        setShowEvictionLawyerFeeModal: params.setShowEvictionLawyerFeeModal,
        setShowEvictionResidentialGraceModal: params.setShowEvictionResidentialGraceModal,
        setShowGuarantorDetailsModal: params.setShowGuarantorDetailsModal,
        setShowHeirsNotificationModal: params.setShowHeirsNotificationModal,
        setShowLinkedDossierTimeline: params.setShowLinkedDossierTimeline,
        setShowRealEstateSeizureModal: params.setShowRealEstateSeizureModal,
        setShowSolidaryCoerciveTargetModal: params.setShowSolidaryCoerciveTargetModal,
        setShowStayOfExecutionModal: params.setShowStayOfExecutionModal,
        setShowTransferFileNumberChangeModal: params.setShowTransferFileNumberChangeModal,
        setEditingNoteId: params.setEditingNoteId,
    };

    const modalAliases = {
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

    return { executionModalFlags, executionModalSetters, modalAliases };
}
