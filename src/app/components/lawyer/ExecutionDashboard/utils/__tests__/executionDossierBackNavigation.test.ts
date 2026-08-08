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

    it('dismissTopDomDialog does not recurse while a dismiss is in flight', () => {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        Object.defineProperty(dialog, 'getBoundingClientRect', {
            value: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
        });
        const closeBtn = document.createElement('button');
        closeBtn.setAttribute('aria-label', 'إغلاق');
        closeBtn.addEventListener('click', () => dialog.remove());
        dialog.appendChild(closeBtn);
        document.body.appendChild(dialog);

        const styleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
            display: 'block',
            visibility: 'visible',
            opacity: '1',
        } as CSSStyleDeclaration);

        expect(dismissTopDomDialog()).toBe(true);
        expect(dismissTopDomDialog()).toBe(false);

        styleSpy.mockRestore();
        dialog.remove();
    });
});
