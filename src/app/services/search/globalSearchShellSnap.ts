/** فتح/إغلاق البحث الشامل لحظياً — علم على html */
import { purgeStaticBootShellAfterBoot } from '@/app/bootstrap/bootStaticShell';

const ATTR = 'data-hami-global-search-open';
const CLOSING_ATTR = 'data-hami-global-search-closing';

export function isGlobalSearchShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

export function snapGlobalSearchShellOpen(): void {
    if (typeof document === 'undefined') return;
    purgeStaticBootShellAfterBoot();
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.setAttribute(ATTR, '1');
}

export function snapGlobalSearchShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
    document.documentElement.removeAttribute(ATTR);
}
