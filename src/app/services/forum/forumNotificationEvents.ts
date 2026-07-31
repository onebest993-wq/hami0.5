export const FORUM_UNREAD_CHANGED_EVENT = 'hami:forum-unread-changed';

export function emitForumUnreadCount(count: number, options?: { refresh?: boolean }): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(FORUM_UNREAD_CHANGED_EVENT, {
            detail: { count, refresh: options?.refresh === true },
        }),
    );
}
