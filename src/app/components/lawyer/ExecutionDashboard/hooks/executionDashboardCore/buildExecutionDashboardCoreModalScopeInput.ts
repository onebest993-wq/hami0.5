/** Phase C Slice 25 — مدخلات modal scope */
// ModalStates في الـ store لا يشمل كل modals المحلية — يُبقى nocheck حتى توسيع النوع
// @ts-nocheck
import type { ModalStates } from '@/app/stores/executionDashboardStore';
import type { ExecutionSeizureOrchestratorSlice } from '../../orchestrators/executionSeizureOrchestratorTypes';

export function buildExecutionDashboardCoreModalScopeInput(p: {
    modals: ModalStates;
    setExecutionModal: (key: keyof ModalStates, show: boolean) => void;
    showLinkedDossierTimeline: boolean;
    showTransferFileNumberChangeModal: boolean;
    showEvictionExpenseModal?: boolean;
    showEvictionLawyerFeeModal?: boolean;
    showEvictionResidentialGraceModal?: boolean;
    showGuarantorDetailsModal?: boolean;
    showHeirsNotificationModal?: boolean;
    showRealEstateSeizureModal?: boolean;
    showSolidaryCoerciveTargetModal?: boolean;
    showStayOfExecutionModal?: boolean;
    showEditDossierMetaModal?: boolean;
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
    setShowLinkedDossierTimeline: (show: boolean) => void;
    setShowTransferFileNumberChangeModal: (show: boolean) => void;
    setEditingNoteId: (id: string | null) => void;
    followupOrchestrator: {
        setShowUnifiedExecutionModal: (show: boolean) => void;
        setShowEvictionExpenseModal: (show: boolean) => void;
        setShowEvictionLawyerFeeModal: (show: boolean) => void;
        setShowEvictionResidentialGraceModal: (show: boolean) => void;
        setShowHeirsNotificationModal: (show: boolean) => void;
        setShowSolidaryCoerciveTargetModal: (show: boolean) => void;
        setShowStayOfExecutionModal: (show: boolean) => void;
    };
    seizureOrchestrator: Pick<
        ExecutionSeizureOrchestratorSlice,
        'setShowGuarantorDetailsModal' | 'setShowRealEstateSeizureModal'
    >;
}) {
    const { modals, followupOrchestrator, seizureOrchestrator } = p;
    return {
        modals,
        setExecutionModal: p.setExecutionModal,
        showUnifiedExecutionModal: modals.showUnifiedExecutionModal,
        showDecisionsModal: modals.showDecisionsModal,
        showDocumentsModal: modals.showDocumentsModal,
        showTimelineModal: modals.showTimelineModal,
        showCoerciveModal: modals.showCoerciveModal,
        showNotificationModal: modals.showNotificationModal,
        showUnifiedSummonsModal: modals.showUnifiedSummonsModal,
        showPaymentModal: modals.showPaymentModal,
        showSeizedAssetsModal: modals.showSeizedAssetsModal,
        showNotesModal: modals.showNotesModal,
        showAppointmentModal: modals.showAppointmentModal,
        showPaymentCalculator: modals.showPaymentCalculator,
        showSettlementCalculator: modals.showSettlementCalculator,
        showPauseModal: modals.showPauseModal,
        showLedgerModal: modals.showLedgerModal,
        // من workflow المقيم — ليس من Zustand (المفتاح غير موجود في ModalStates)
        showEditDossierMetaModal: Boolean(p.showEditDossierMetaModal),
        showEvictionExpenseModal: p.showEvictionExpenseModal ?? modals.showEvictionExpenseModal,
        showEvictionLawyerFeeModal: p.showEvictionLawyerFeeModal ?? modals.showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal:
            p.showEvictionResidentialGraceModal ?? modals.showEvictionResidentialGraceModal,
        showGuarantorDetailsModal: p.showGuarantorDetailsModal ?? modals.showGuarantorDetailsModal,
        showHeirsNotificationModal: p.showHeirsNotificationModal ?? modals.showHeirsNotificationModal,
        showLinkedDossierTimeline: p.showLinkedDossierTimeline,
        showRealEstateSeizureModal: p.showRealEstateSeizureModal ?? modals.showRealEstateSeizureModal,
        showSolidaryCoerciveTargetModal:
            p.showSolidaryCoerciveTargetModal ?? modals.showSolidaryCoerciveTargetModal,
        showStayOfExecutionModal: p.showStayOfExecutionModal ?? modals.showStayOfExecutionModal,
        showTransferFileNumberChangeModal: p.showTransferFileNumberChangeModal,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setShowDecisionsModal: p.setShowDecisionsModal,
        setShowDocumentsModal: p.setShowDocumentsModal,
        setShowTimelineModal: p.setShowTimelineModal,
        setShowCoerciveModal: p.setShowCoerciveModal,
        setShowNotificationModal: p.setShowNotificationModal,
        setShowUnifiedSummonsModal: p.setShowUnifiedSummonsModal,
        setShowPaymentModal: p.setShowPaymentModal,
        setShowSeizedAssetsModal: p.setShowSeizedAssetsModal,
        setShowNotesModal: p.setShowNotesModal,
        setShowAppointmentModal: p.setShowAppointmentModal,
        setShowPaymentCalculator: p.setShowPaymentCalculator,
        setShowSettlementCalculator: p.setShowSettlementCalculator,
        setShowPauseModal: p.setShowPauseModal,
        setShowLedgerModal: p.setShowLedgerModal,
        setShowEditDossierMetaModal: p.setShowEditDossierMetaModal,
        setShowEvictionExpenseModal: followupOrchestrator.setShowEvictionExpenseModal,
        setShowEvictionLawyerFeeModal: followupOrchestrator.setShowEvictionLawyerFeeModal,
        setShowEvictionResidentialGraceModal: followupOrchestrator.setShowEvictionResidentialGraceModal,
        setShowGuarantorDetailsModal: seizureOrchestrator.setShowGuarantorDetailsModal,
        setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,
        setShowLinkedDossierTimeline: p.setShowLinkedDossierTimeline,
        setShowRealEstateSeizureModal: seizureOrchestrator.setShowRealEstateSeizureModal,
        setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
        setShowStayOfExecutionModal: followupOrchestrator.setShowStayOfExecutionModal,
        setShowTransferFileNumberChangeModal: p.setShowTransferFileNumberChangeModal,
        setEditingNoteId: p.setEditingNoteId,
    };
}
