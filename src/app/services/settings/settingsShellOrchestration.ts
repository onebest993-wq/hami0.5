/** إغلاق overlays المتنافسة قبل فتح مركز الإعدادات — نفس نمط المنتدى والمعاملات */
export type CloseOverlaysBeforeSettingsInput = {
    closeNotifications: () => void;
    closeGlobalSearch: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeSettingsOpen(input: CloseOverlaysBeforeSettingsInput): void {
    input.closeNotifications();
    input.closeGlobalSearch();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
    input.closeCommunity();
}
