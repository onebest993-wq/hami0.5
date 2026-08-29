import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { pushCriminalLocalOverlayBack } from './criminalLocalOverlayBackStack';
import {
    resolveProceduralCanvasOverlayBack,
    type ProceduralCanvasOverlayBackState,
} from './resolveProceduralCanvasOverlayBack';

type UseProceduralCanvasOverlayEscapeParams = ProceduralCanvasOverlayBackState & {
    onCloseConfirmDelete: () => void;
    onCloseAdvanceModal: () => void;
    onCloseAddChild: () => void;
    onCloseNoteModal: () => void;
    onCloseActionModal: () => void;
    onCloseContainerModal: () => void;
};

/**
 * Escape (capture) + native back + تسجيل في مكدس الهيدر لطبقات canvas المحلية.
 */
export function useProceduralCanvasOverlayEscape({
    confirmDeleteOpen,
    advanceModalOpen,
    addChildOpen,
    noteModalOpen,
    actionModalOpen,
    containerModalOpen,
    onCloseConfirmDelete,
    onCloseAdvanceModal,
    onCloseAddChild,
    onCloseNoteModal,
    onCloseActionModal,
    onCloseContainerModal,
}: UseProceduralCanvasOverlayEscapeParams): void {
    useEffect(() => {
        const state: ProceduralCanvasOverlayBackState = {
            confirmDeleteOpen,
            advanceModalOpen,
            addChildOpen,
            noteModalOpen,
            actionModalOpen,
            containerModalOpen,
        };
        if (!resolveProceduralCanvasOverlayBack(state)) return;

        const consumeTopLayer = (): boolean => {
            const action = resolveProceduralCanvasOverlayBack({
                confirmDeleteOpen,
                advanceModalOpen,
                addChildOpen,
                noteModalOpen,
                actionModalOpen,
                containerModalOpen,
            });
            if (action === 'close-confirm-delete') {
                onCloseConfirmDelete();
                return true;
            }
            if (action === 'close-advance-modal') {
                onCloseAdvanceModal();
                return true;
            }
            if (action === 'close-add-child') {
                onCloseAddChild();
                return true;
            }
            if (action === 'close-note-modal') {
                onCloseNoteModal();
                return true;
            }
            if (action === 'close-action-modal') {
                onCloseActionModal();
                return true;
            }
            if (action === 'close-container-modal') {
                onCloseContainerModal();
                return true;
            }
            return false;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (!consumeTopLayer()) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consumeTopLayer());
        const unregisterHeaderBack = pushCriminalLocalOverlayBack(consumeTopLayer);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
            unregisterHeaderBack();
        };
    }, [
        addChildOpen,
        advanceModalOpen,
        actionModalOpen,
        confirmDeleteOpen,
        containerModalOpen,
        noteModalOpen,
        onCloseAddChild,
        onCloseAdvanceModal,
        onCloseActionModal,
        onCloseConfirmDelete,
        onCloseContainerModal,
        onCloseNoteModal,
    ]);
}
