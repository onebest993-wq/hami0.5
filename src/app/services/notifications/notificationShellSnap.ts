/**
 * فتح/إغلاق لوحة الإشعارات لحظياً.
 * المصدر البصري: html[data-hami-notifications-open]
 */

const ROOT_SELECTOR = '[data-notification-root]';
const ATTR = 'data-hami-notifications-open';
const CLOSING_ATTR = 'data-hami-notifications-closing';

export const NOTIFICATION_SHELL_SNAP_EVENT = 'hami:notification-shell-snap';

export type NotificationShellSnapState = {
    open: boolean;
    /** الورقة ما زالت مرئية وهي تهبط — ليست مفتوحة ولا غائبة */
    closing: boolean;
};

export function readNotificationShellSnapState(): NotificationShellSnapState {
    if (typeof document === 'undefined') return { open: false, closing: false };
    const root = document.documentElement;
    return {
        open: root.getAttribute(ATTR) === '1',
        closing: root.getAttribute(CLOSING_ATTR) === '1',
    };
}

/** يُعلن تغيّر ستارة html حتى تقرأها React بلا مراقبة DOM يدوية. */
export function emitNotificationShellSnap(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<NotificationShellSnapState>(NOTIFICATION_SHELL_SNAP_EVENT, {
            detail: readNotificationShellSnapState(),
        }),
    );
}

export function isNotificationShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/** يضع علم الفتح فوراً حتى يحرّك CSS الورقة قبل React — بلا إعادة تخطيط متزامن. */
export function snapNotificationShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.setAttribute(ATTR, '1');
    emitNotificationShellSnap();
    return Boolean(document.querySelector(ROOT_SELECTOR));
}

export function snapNotificationShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.removeAttribute(ATTR);
    emitNotificationShellSnap();
}

export function hasNotificationOverlayHost(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector(ROOT_SELECTOR));
}

/** للاختبارات */
export function resetNotificationShellSnapForTests(): void {
    if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute(ATTR);
        document.documentElement.removeAttribute(CLOSING_ATTR);
    }
}
