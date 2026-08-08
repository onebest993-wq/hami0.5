/** فتح/إغلاق البحث الشامل لحظياً — علم على html (مثل التقويم) */
import { purgeStaticBootShellAfterBoot } from '@/app/bootstrap/bootStaticShell';

const ATTR = 'data-hami-global-search-open';

export function isGlobalSearchShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

export function snapGlobalSearchShellOpen(): void {
    if (typeof document === 'undefined') return;
    purgeStaticBootShellAfterBoot();
    document.documentElement.setAttribute(ATTR, '1');
}

export function snapGlobalSearchShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(ATTR);
}
