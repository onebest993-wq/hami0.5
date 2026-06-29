/** إغلاق overlays المتنافسة قبل فتح لوحة الإشعارات — نفس نمط البحث/الإعدادات */
export type CloseOverlaysBeforeNotificationsInput = {
    closeGlobalSearch: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeNotificationsOpen(input: CloseOverlaysBeforeNotificationsInput): void {
    input.closeGlobalSearch();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
    input.closeCommunity();
}
