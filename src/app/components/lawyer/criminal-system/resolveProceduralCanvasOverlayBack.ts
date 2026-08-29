/**
 * ترتيب إغلاق طبقات لوحة المسارات (الأعلى أولاً):
 * تأكيد الحذف (z أعلى) → تقديم المرحلة → إضافة فرع → ملاحظة → إجراء → حاوية.
 * (note/action/container بنفس z procedural؛ الترتيب المنطقي بعد addChild)
 */
export type ProceduralCanvasOverlayBackState = {
    confirmDeleteOpen: boolean;
    advanceModalOpen: boolean;
    addChildOpen: boolean;
    noteModalOpen: boolean;
    actionModalOpen: boolean;
    containerModalOpen: boolean;
};

type ProceduralCanvasOverlayBackAction =
    | 'close-confirm-delete'
    | 'close-advance-modal'
    | 'close-add-child'
    | 'close-note-modal'
    | 'close-action-modal'
    | 'close-container-modal'
    | null;

export function resolveProceduralCanvasOverlayBack(
    state: ProceduralCanvasOverlayBackState,
): ProceduralCanvasOverlayBackAction {
    if (state.confirmDeleteOpen) return 'close-confirm-delete';
    if (state.advanceModalOpen) return 'close-advance-modal';
    if (state.addChildOpen) return 'close-add-child';
    if (state.noteModalOpen) return 'close-note-modal';
    if (state.actionModalOpen) return 'close-action-modal';
    if (state.containerModalOpen) return 'close-container-modal';
    return null;
}
