import type { ExecutionModalFlags } from './buildExecutionDashboardModalScope';

export function pickExecutionModalFlags(modalScopeParams: {
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
}): ExecutionModalFlags {
    return {
        showUnifiedExecutionModal: modalScopeParams.showUnifiedExecutionModal,
        showDecisionsModal: modalScopeParams.showDecisionsModal,
        showDocumentsModal: modalScopeParams.showDocumentsModal,
        showTimelineModal: modalScopeParams.showTimelineModal,
        showCoerciveModal: modalScopeParams.showCoerciveModal,
        showNotificationModal: modalScopeParams.showNotificationModal,
        showUnifiedSummonsModal: modalScopeParams.showUnifiedSummonsModal,
        showPaymentModal: modalScopeParams.showPaymentModal,
        showSeizedAssetsModal: modalScopeParams.showSeizedAssetsModal,
        showNotesModal: modalScopeParams.showNotesModal,
        showAppointmentModal: modalScopeParams.showAppointmentModal,
        showPaymentCalculator: modalScopeParams.showPaymentCalculator,
        showSettlementCalculator: modalScopeParams.showSettlementCalculator,
        showPauseModal: modalScopeParams.showPauseModal,
        showLedgerModal: modalScopeParams.showLedgerModal,
        showEditDossierMetaModal: modalScopeParams.showEditDossierMetaModal,
        showEvictionExpenseModal: modalScopeParams.showEvictionExpenseModal,
        showEvictionLawyerFeeModal: modalScopeParams.showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal: modalScopeParams.showEvictionResidentialGraceModal,
        showGuarantorDetailsModal: modalScopeParams.showGuarantorDetailsModal,
        showHeirsNotificationModal: modalScopeParams.showHeirsNotificationModal,
        showLinkedDossierTimeline: modalScopeParams.showLinkedDossierTimeline,
        showRealEstateSeizureModal: modalScopeParams.showRealEstateSeizureModal,
        showSolidaryCoerciveTargetModal: modalScopeParams.showSolidaryCoerciveTargetModal,
        showStayOfExecutionModal: modalScopeParams.showStayOfExecutionModal,
        showTransferFileNumberChangeModal: modalScopeParams.showTransferFileNumberChangeModal,
    };
}
