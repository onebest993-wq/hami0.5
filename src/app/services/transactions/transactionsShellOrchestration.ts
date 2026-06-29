/** إغلاق overlays المتنافسة قبل فتح مركز المعاملات — نفس نمط المنتدى والإشعارات */
export type CloseOverlaysBeforeTransactionsInput = {
    closeNotifications: () => void;
    closeGlobalSearch: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeTransactionsOpen(input: CloseOverlaysBeforeTransactionsInput): void {
    input.closeNotifications();
    input.closeGlobalSearch();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeCommunity();
}
