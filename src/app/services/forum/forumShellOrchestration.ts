/** إغلاق overlays المتنافسة قبل فتح المنتدى — نفس نمط الإشعارات والبحث */
export type CloseOverlaysBeforeForumInput = {
    closeNotifications: () => void;
    closeGlobalSearch: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
};

export function closeOverlaysBeforeForumOpen(input: CloseOverlaysBeforeForumInput): void {
    input.closeNotifications();
    input.closeGlobalSearch();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
}
