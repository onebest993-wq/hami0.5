import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    closeTopExecutionDashboardStoreModal,
    dismissTopDomDialog,
    runExecutionDossierBackStep,
} from '../executionDossierBackNavigation';

const closeModal = vi.fn();
const getState = vi.fn();

vi.mock('@/app/stores/executionDashboardStore', () => ({
    useExecutionDashboardStore: {
        getState: () => getState(),
    },
}));

describe('executionDossierBackNavigation', () => {
    beforeEach(() => {
        closeModal.mockReset();
        getState.mockReset();
    });

    it('closes the topmost open store modal first', () => {
        getState.mockReturnValue({
            modals: {
                showUnifiedSummonsModal: true,
                showUnifiedExecutionModal: true,
                showNotesModal: false,
            },
            closeModal,
        });
        expect(closeTopExecutionDashboardStoreModal()).toBe(true);
        expect(closeModal).toHaveBeenCalledWith('showUnifiedSummonsModal');
    });

    it('runs local overlay and dossier context steps after store modals', () => {
        getState.mockReturnValue({
            modals: { showUnifiedSummonsModal: false },
            closeModal,
        });
        const closeLocalOverlay = vi.fn(() => true);
        const dossierContextBack = vi.fn(() => true);
        expect(
            runExecutionDossierBackStep({ closeLocalOverlay, dossierContextBack }),
        ).toBe(true);
        expect(closeLocalOverlay).toHaveBeenCalledTimes(1);
        expect(dossierContextBack).not.toHaveBeenCalled();
    });

    it('skips dom dialog dismiss for header back unless explicitly requested', () => {
        getState.mockReturnValue({
            modals: { showUnifiedSummonsModal: false },
            closeModal,
        });
        const dismissSpy = vi.spyOn(
            { dismissTopDomDialog },
            'dismissTopDomDialog',
        );
        dismissSpy.mockReturnValue(true);
        const dossierContextBack = vi.fn(() => true);
        expect(
            runExecutionDossierBackStep({ dossierContextBack, includeDomDialogDismiss: false }),
        ).toBe(true);
        expect(dismissSpy).not.toHaveBeenCalled();
        expect(dossierContextBack).toHaveBeenCalledTimes(1);
        dismissSpy.mockRestore();
    });
});
