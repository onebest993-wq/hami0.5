import { describe, expect, it, vi } from 'vitest';
import { buildExecutionDashboardCoreModalScopeInput } from '../buildExecutionDashboardCoreModalScopeInput';
import type { ModalStates } from '@/app/stores/executionDashboardStore';

const baseModals = {
    showPaymentModal: false,
    showNotificationModal: false,
    showDocumentsModal: false,
    showAppointmentModal: false,
    showCoerciveModal: false,
    showPaymentCalculator: false,
    showSettlementCalculator: false,
    showNotesModal: false,
    showDecisionsModal: false,
    showSeizedAssetsModal: false,
    showTimelineModal: false,
    showUnifiedExecutionModal: false,
    showUnifiedSummonsModal: false,
    showLedgerModal: false,
    showPauseModal: false,
    showLawReferencePanel: false,
} as ModalStates;

describe('buildExecutionDashboardCoreModalScopeInput — dossier meta flag', () => {
    it('reads showEditDossierMetaModal from workflow param, not Zustand ModalStates', () => {
        const setShow = vi.fn();
        const scope = buildExecutionDashboardCoreModalScopeInput({
            modals: baseModals,
            setExecutionModal: vi.fn(),
            showLinkedDossierTimeline: false,
            showTransferFileNumberChangeModal: false,
            showEditDossierMetaModal: true,
            setShowDecisionsModal: vi.fn(),
            setShowDocumentsModal: vi.fn(),
            setShowTimelineModal: vi.fn(),
            setShowCoerciveModal: vi.fn(),
            setShowNotificationModal: vi.fn(),
            setShowUnifiedSummonsModal: vi.fn(),
            setShowPaymentModal: vi.fn(),
            setShowSeizedAssetsModal: vi.fn(),
            setShowNotesModal: vi.fn(),
            setShowAppointmentModal: vi.fn(),
            setShowPaymentCalculator: vi.fn(),
            setShowSettlementCalculator: vi.fn(),
            setShowPauseModal: vi.fn(),
            setShowLedgerModal: vi.fn(),
            setShowEditDossierMetaModal: setShow,
            setShowLinkedDossierTimeline: vi.fn(),
            setShowTransferFileNumberChangeModal: vi.fn(),
            setEditingNoteId: vi.fn(),
            followupOrchestrator: {
                setShowUnifiedExecutionModal: vi.fn(),
                setShowEvictionExpenseModal: vi.fn(),
                setShowEvictionLawyerFeeModal: vi.fn(),
                setShowEvictionResidentialGraceModal: vi.fn(),
                setShowHeirsNotificationModal: vi.fn(),
                setShowSolidaryCoerciveTargetModal: vi.fn(),
                setShowStayOfExecutionModal: vi.fn(),
            },
            seizureOrchestrator: {
                setShowGuarantorDetailsModal: vi.fn(),
                setShowRealEstateSeizureModal: vi.fn(),
            },
        });

        expect(scope.showEditDossierMetaModal).toBe(true);
        expect(scope.setShowEditDossierMetaModal).toBe(setShow);
        // ModalStates لا يملك المفتاح — القراءة القديمة كانت دائماً undefined
        expect(
            Object.prototype.hasOwnProperty.call(baseModals, 'showEditDossierMetaModal'),
        ).toBe(false);
    });

    it('defaults to false when workflow flag omitted', () => {
        const scope = buildExecutionDashboardCoreModalScopeInput({
            modals: baseModals,
            setExecutionModal: vi.fn(),
            showLinkedDossierTimeline: false,
            showTransferFileNumberChangeModal: false,
            setShowDecisionsModal: vi.fn(),
            setShowDocumentsModal: vi.fn(),
            setShowTimelineModal: vi.fn(),
            setShowCoerciveModal: vi.fn(),
            setShowNotificationModal: vi.fn(),
            setShowUnifiedSummonsModal: vi.fn(),
            setShowPaymentModal: vi.fn(),
            setShowSeizedAssetsModal: vi.fn(),
            setShowNotesModal: vi.fn(),
            setShowAppointmentModal: vi.fn(),
            setShowPaymentCalculator: vi.fn(),
            setShowSettlementCalculator: vi.fn(),
            setShowPauseModal: vi.fn(),
            setShowLedgerModal: vi.fn(),
            setShowEditDossierMetaModal: vi.fn(),
            setShowLinkedDossierTimeline: vi.fn(),
            setShowTransferFileNumberChangeModal: vi.fn(),
            setEditingNoteId: vi.fn(),
            followupOrchestrator: {
                setShowUnifiedExecutionModal: vi.fn(),
                setShowEvictionExpenseModal: vi.fn(),
                setShowEvictionLawyerFeeModal: vi.fn(),
                setShowEvictionResidentialGraceModal: vi.fn(),
                setShowHeirsNotificationModal: vi.fn(),
                setShowSolidaryCoerciveTargetModal: vi.fn(),
                setShowStayOfExecutionModal: vi.fn(),
            },
            seizureOrchestrator: {
                setShowGuarantorDetailsModal: vi.fn(),
                setShowRealEstateSeizureModal: vi.fn(),
            },
        });

        expect(scope.showEditDossierMetaModal).toBe(false);
    });
});
