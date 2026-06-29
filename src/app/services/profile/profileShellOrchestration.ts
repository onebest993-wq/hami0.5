/** إغلاق overlays المتنافسة قبل فتح تبويب الملف المهني */
export type CloseOverlaysBeforeProfileOpenInput = {
    closeGlobalSearch: () => void;
    closeNotifications: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeProfileOpen(input: CloseOverlaysBeforeProfileOpenInput): void {
    input.closeGlobalSearch();
    input.closeNotifications();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
    input.closeCommunity();
}
