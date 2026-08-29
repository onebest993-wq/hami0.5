/**
 * فتح/إغلاق مركز المعاملات لحظياً.
 * المصدر البصري: html[data-hami-transactions-open]
 */

const HUB_SELECTOR = '[data-testid="transactions-hub"]';
const ATTR = 'data-hami-transactions-open';
export const TRANSACTIONS_INSTANT_CHROME_ID = 'hami-transactions-instant-chrome';

export function isTransactionsShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

export function snapTransactionsShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    document.documentElement.setAttribute(ATTR, '1');
    return Boolean(document.querySelector(HUB_SELECTOR));
}

export function snapTransactionsShellClose(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(ATTR);
    document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)?.remove();
}
