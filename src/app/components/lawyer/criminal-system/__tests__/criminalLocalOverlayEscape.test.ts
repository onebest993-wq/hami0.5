import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProceduralCanvasOverlayEscape } from '../useProceduralCanvasOverlayEscape';
import { useCriminalLocalOverlayEscape } from '../useCriminalLocalOverlayEscape';
import {
    criminalLocalOverlayBackStackDepthForTests,
    resetCriminalLocalOverlayBackStackForTests,
    tryPopCriminalLocalOverlayBack,
} from '../criminalLocalOverlayBackStack';

let nativeBackHandlers: Array<() => boolean> = [];

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeBackHandlers.push(handler);
        return () => {
            const idx = nativeBackHandlers.lastIndexOf(handler);
            if (idx >= 0) nativeBackHandlers.splice(idx, 1);
        };
    },
}));

function pressEscape() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
}

function dispatchTopNativeBack(): boolean {
    for (let i = nativeBackHandlers.length - 1; i >= 0; i -= 1) {
        if (nativeBackHandlers[i]?.()) return true;
    }
    return false;
}

const closedOverlays = {
    confirmDeleteOpen: false,
    advanceModalOpen: false,
    addChildOpen: false,
    noteModalOpen: false,
    actionModalOpen: false,
    containerModalOpen: false,
    onCloseConfirmDelete: vi.fn(),
    onCloseAdvanceModal: vi.fn(),
    onCloseAddChild: vi.fn(),
    onCloseNoteModal: vi.fn(),
    onCloseActionModal: vi.fn(),
    onCloseContainerModal: vi.fn(),
};

describe('useProceduralCanvasOverlayEscape', () => {
    beforeEach(() => {
        nativeBackHandlers = [];
        resetCriminalLocalOverlayBackStackForTests();
        Object.assign(closedOverlays, {
            onCloseConfirmDelete: vi.fn(),
            onCloseAdvanceModal: vi.fn(),
            onCloseAddChild: vi.fn(),
            onCloseNoteModal: vi.fn(),
            onCloseActionModal: vi.fn(),
            onCloseContainerModal: vi.fn(),
        });
    });

    it('Escape closes confirm-delete before advance/add-child', () => {
        renderHook(() =>
            useProceduralCanvasOverlayEscape({
                ...closedOverlays,
                confirmDeleteOpen: true,
                advanceModalOpen: true,
                addChildOpen: true,
            }),
        );
        pressEscape();
        expect(closedOverlays.onCloseConfirmDelete).toHaveBeenCalledTimes(1);
        expect(closedOverlays.onCloseAdvanceModal).not.toHaveBeenCalled();
        expect(closedOverlays.onCloseAddChild).not.toHaveBeenCalled();
    });

    it('native back closes note before action/container', () => {
        renderHook(() =>
            useProceduralCanvasOverlayEscape({
                ...closedOverlays,
                noteModalOpen: true,
                actionModalOpen: true,
                containerModalOpen: true,
            }),
        );
        expect(dispatchTopNativeBack()).toBe(true);
        expect(closedOverlays.onCloseNoteModal).toHaveBeenCalledTimes(1);
        expect(closedOverlays.onCloseActionModal).not.toHaveBeenCalled();
        expect(closedOverlays.onCloseContainerModal).not.toHaveBeenCalled();
    });

    it('header back stack closes container when it is the top layer', () => {
        renderHook(() =>
            useProceduralCanvasOverlayEscape({
                ...closedOverlays,
                containerModalOpen: true,
            }),
        );
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(1);
        expect(tryPopCriminalLocalOverlayBack()).toBe(true);
        expect(closedOverlays.onCloseContainerModal).toHaveBeenCalledTimes(1);
    });

    it('does not register when no overlay is open', () => {
        renderHook(() => useProceduralCanvasOverlayEscape(closedOverlays));
        expect(nativeBackHandlers).toHaveLength(0);
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(0);
    });
});

describe('useCriminalLocalOverlayEscape', () => {
    beforeEach(() => {
        nativeBackHandlers = [];
        resetCriminalLocalOverlayBackStackForTests();
    });

    it('Escape and native back close the local overlay', () => {
        const onClose = vi.fn();
        renderHook(() => useCriminalLocalOverlayEscape({ open: true, onClose }));
        pressEscape();
        expect(onClose).toHaveBeenCalledTimes(1);
        onClose.mockClear();
        expect(dispatchTopNativeBack()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('registers on header back stack while open', () => {
        const onClose = vi.fn();
        renderHook(() => useCriminalLocalOverlayEscape({ open: true, onClose }));
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(1);
        expect(tryPopCriminalLocalOverlayBack()).toBe(true);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not register when closed', () => {
        renderHook(() => useCriminalLocalOverlayEscape({ open: false, onClose: vi.fn() }));
        expect(nativeBackHandlers).toHaveLength(0);
        expect(criminalLocalOverlayBackStackDepthForTests()).toBe(0);
    });
});
