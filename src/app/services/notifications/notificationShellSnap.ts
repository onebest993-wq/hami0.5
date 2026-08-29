/**
 * فتح/إغلاق لوحة الإشعارات لحظياً.
 * المصدر البصري: html[data-hami-notifications-open]
 */

const ROOT_SELECTOR = '[data-notification-root]';
const ATTR = 'data-hami-notifications-open';
const CLOSING_ATTR = 'data-hami-notifications-closing';

let shellSyncGen = 0;

export function isNotificationShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/** يضع علم الفتح فوراً حتى يحرّك CSS الورقة قبل React — بلا إعادة تخطيط متزامن. */
export function snapNotificationShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.setAttribute(ATTR, '1');
    return Boolean(document.querySelector(ROOT_SELECTOR));
}

export function snapNotificationShellClose(): void {
    if (typeof document === 'undefined') return;
    shellSyncGen += 1;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.removeAttribute(ATTR);
}

export function hasNotificationOverlayHost(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.querySelector(ROOT_SELECTOR));
}

/** للاختبارات */
export function resetNotificationShellSnapForTests(): void {
    shellSyncGen += 1;
    if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute(ATTR);
        document.documentElement.removeAttribute(CLOSING_ATTR);
    }
}
