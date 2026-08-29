/**
 * فتح/إغلاق مركز الإعدادات لحظياً.
 * المصدر البصري: html[data-hami-settings-open]
 * (React يعيد className ويمسح --visible — هذا العلم لا يُمسَح.)
 */

const HOST_SELECTOR = '[data-testid="hami-settings-overlay-host"]';
const ATTR = 'data-hami-settings-open';
const CLOSING_ATTR = 'data-hami-settings-closing';

export function isSettingsShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/**
 * يضع علم الفتح فوراً حتى بلا Host —
 * يخفي اللوحة بالـ CSS ويكشف طبقة الإعدادات قبل React.
 * بلا offsetHeight: كان يجمّد لمسة الترس بإعادة تخطيط.
 */
export function snapSettingsShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.setAttribute(ATTR, '1');
    return Boolean(document.querySelector(HOST_SELECTOR));
}

export function snapSettingsShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.removeAttribute(ATTR);
}

/** للاختبارات */
export function resetSettingsShellSnapForTests(): void {
    if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute(ATTR);
        document.documentElement.removeAttribute(CLOSING_ATTR);
    }
}
