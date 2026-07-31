import { describe, expect, it, vi } from 'vitest';
import { assignShellOverlayScopeWithFallback } from '../assignShellOverlayScopeWithFallback';

vi.mock('@/app/stores/executionDashboardStore', () => ({
    useExecutionDashboardStore: {
        getState: () => ({
            modals: {
                showNotesModal: false,
                showAppointmentModal: false,
                showDocumentsModal: false,
                showTimelineModal: false,
                showDecisionsModal: false,
                showSeizedAssetsModal: false,
                showPaymentModal: false,
                showNotificationModal: false,
                showCoerciveModal: false,
                showPaymentCalculator: false,
                showSettlementCalculator: false,
                showPauseModal: false,
                showUnifiedSummonsModal: false,
                showLedgerModal: false,
            },
            openModal: vi.fn(),
            closeModal: vi.fn(),
        }),
    },
}));

describe('assignShellOverlayScopeWithFallback', () => {
    it('mutates target and prefers scope setters when present', () => {
        const setShowNotesModal = vi.fn();
        const target: Record<string, unknown> = {};
        const out = assignShellOverlayScopeWithFallback(target, {
            showNotesModal: true,
            setShowNotesModal,
            customFlag: 1,
        });
        expect(out).toBe(target);
        expect(out.showNotesModal).toBe(true);
        expect(out.setShowNotesModal).toBe(setShowNotesModal);
        expect(out.customFlag).toBe(1);
        expect(out.AlertCircle).toBeTruthy();
        expect(out.EXEC_MODAL_Z).toBeTruthy();
    });
});
