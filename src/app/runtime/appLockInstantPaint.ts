/** ستارة قفل الجلسة الفورية على html — قبل paint React / تحميل chunk */

const ATTR = 'data-hami-app-locked';

export function isAppLockSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

export function snapAppLockOpen(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute(ATTR, '1');
}

export function snapAppLockClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(ATTR);
}
