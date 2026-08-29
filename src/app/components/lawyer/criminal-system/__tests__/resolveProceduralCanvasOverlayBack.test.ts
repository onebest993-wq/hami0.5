import { describe, expect, it, beforeEach } from 'vitest';
import { resolveProceduralCanvasOverlayBack } from '../resolveProceduralCanvasOverlayBack';

const noneOpen = {
    confirmDeleteOpen: false,
    advanceModalOpen: false,
    addChildOpen: false,
    noteModalOpen: false,
    actionModalOpen: false,
    containerModalOpen: false,
};

describe('resolveProceduralCanvasOverlayBack', () => {
    it('returns null when no canvas overlay is open', () => {
        expect(resolveProceduralCanvasOverlayBack(noneOpen)).toBeNull();
    });

    it('prioritizes confirm-delete over all other layers', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                confirmDeleteOpen: true,
                advanceModalOpen: true,
                addChildOpen: true,
                noteModalOpen: true,
                actionModalOpen: true,
                containerModalOpen: true,
            }),
        ).toBe('close-confirm-delete');
    });

    it('prioritizes advance modal over add-child and form modals', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                advanceModalOpen: true,
                addChildOpen: true,
                noteModalOpen: true,
            }),
        ).toBe('close-advance-modal');
    });

    it('closes add-child before note/action/container', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                addChildOpen: true,
                noteModalOpen: true,
                actionModalOpen: true,
                containerModalOpen: true,
            }),
        ).toBe('close-add-child');
    });

    it('closes note before action and container', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                noteModalOpen: true,
                actionModalOpen: true,
                containerModalOpen: true,
            }),
        ).toBe('close-note-modal');
    });

    it('closes action before container', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                actionModalOpen: true,
                containerModalOpen: true,
            }),
        ).toBe('close-action-modal');
    });

    it('closes container when it is the only open layer', () => {
        expect(
            resolveProceduralCanvasOverlayBack({
                ...noneOpen,
                containerModalOpen: true,
            }),
        ).toBe('close-container-modal');
    });
});
