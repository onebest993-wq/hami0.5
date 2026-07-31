import { describe, expect, it, vi } from 'vitest';
import { pickExecutionModalSetters } from '../buildExecutionDashboardModalScope';

describe('pickExecutionModalSetters', () => {
    it('copies setter function references (stable leaves)', () => {
        const setShowNotesModal = vi.fn();
        const setEditingNoteId = vi.fn();
        const params = {
            setShowUnifiedExecutionModal: vi.fn(),
            setShowDecisionsModal: vi.fn(),
            setShowDocumentsModal: vi.fn(),
            setShowTimelineModal: vi.fn(),
            setShowCoerciveModal: vi.fn(),
            setShowNotificationModal: vi.fn(),
            setShowUnifiedSummonsModal: vi.fn(),
            setShowPaymentModal: vi.fn(),
            setShowSeizedAssetsModal: vi.fn(),
            setShowNotesModal,
            setShowAppointmentModal: vi.fn(),
            setShowPaymentCalculator: vi.fn(),
            setShowSettlementCalculator: vi.fn(),
            setShowPauseModal: vi.fn(),
            setShowLedgerModal: vi.fn(),
            setShowEditDossierMetaModal: vi.fn(),
            setShowEvictionExpenseModal: vi.fn(),
            setShowEvictionLawyerFeeModal: vi.fn(),
            setShowEvictionResidentialGraceModal: vi.fn(),
            setShowGuarantorDetailsModal: vi.fn(),
            setShowHeirsNotificationModal: vi.fn(),
            setShowLinkedDossierTimeline: vi.fn(),
            setShowRealEstateSeizureModal: vi.fn(),
            setShowSolidaryCoerciveTargetModal: vi.fn(),
            setShowStayOfExecutionModal: vi.fn(),
            setShowTransferFileNumberChangeModal: vi.fn(),
            setEditingNoteId,
        };
        const a = pickExecutionModalSetters(params);
        const b = pickExecutionModalSetters(params);
        expect(a.setShowNotesModal).toBe(setShowNotesModal);
        expect(b.setShowNotesModal).toBe(a.setShowNotesModal);
        expect(a.setEditingNoteId).toBe(setEditingNoteId);
        expect(a).not.toBe(b);
    });
});
