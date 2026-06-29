/** فتح المنتدى من لوحة المحامي — منطق موحّد */
export const FORUM_SHELL_FEATURE = 'المنتدى القانوني';

export type OpenLawyerForumInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openLawyerForumFromShell(input: OpenLawyerForumInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}

export function shouldShowForumUnreadBadge(unreadCount: number): boolean {
    return unreadCount > 0;
}

export function formatForumUnreadBadge(unreadCount: number): string {
    if (unreadCount > 99) return '99+';
    return String(unreadCount);
}

/** تسمية قارئ الشاشة — تتضمن عدد غير المقروء عند وجود شارة */
export function resolveForumShellAriaLabel(
    unreadCount: number,
    options?: { layoutEditMode?: boolean },
): string {
    if (options?.layoutEditMode || !shouldShowForumUnreadBadge(unreadCount)) {
        return FORUM_SHELL_FEATURE;
    }
    return `${FORUM_SHELL_FEATURE}، ${formatForumUnreadBadge(unreadCount)} غير مقروء`;
}
