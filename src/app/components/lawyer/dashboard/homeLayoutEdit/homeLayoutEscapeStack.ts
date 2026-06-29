/** لقطة وضع تخصيص الواجهة — الأعمق أولاً */
export type HomeLayoutEscapeSnapshot = {
    dragging: boolean;
    selectedBlockId: string | null;
};

export type HomeLayoutEscapeAction = 'cancel-drag' | 'close-customizer' | 'exit-edit';

export function resolveHomeLayoutEscapeAction(
    snapshot: HomeLayoutEscapeSnapshot,
): HomeLayoutEscapeAction {
    if (snapshot.dragging) return 'cancel-drag';
    if (snapshot.selectedBlockId) return 'close-customizer';
    return 'exit-edit';
}
