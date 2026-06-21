/** فتح لوحة الإشعارات من هيدر اللوحة */
export const NOTIFICATIONS_SHELL_FEATURE = 'الإشعارات';

export type OpenNotificationsShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openNotificationsFromShell(input: OpenNotificationsShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}

export function computeNotificationsShellUnreadCount(
    storeUnreadCount: number,
    caseSharePendingCount: number,
): number {
    return Math.max(0, storeUnreadCount) + Math.max(0, caseSharePendingCount);
}
