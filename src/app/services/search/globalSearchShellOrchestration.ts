/** إغلاق overlays المتنافسة قبل فتح البحث الشامل */
export type CloseOverlaysBeforeGlobalSearchInput = {
    closeNotifications: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeGlobalSearchOpen(input: CloseOverlaysBeforeGlobalSearchInput): void {
    input.closeNotifications();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
    input.closeCommunity();
}
