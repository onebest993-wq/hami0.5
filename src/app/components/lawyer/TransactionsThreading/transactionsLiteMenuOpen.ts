export const TX_LITE_MENU_OPEN_ATTR = 'data-hami-tx-lite-menu';
export const TX_LITE_MENU_CLOSE_EVENT = 'hami-tx-lite-menu-close';

export function isTransactionsLiteMenuOpen(): boolean {
    return typeof document !== 'undefined' && document.documentElement.getAttribute(TX_LITE_MENU_OPEN_ATTR) === '1';
}

export function markTransactionsLiteMenuOpen(open: boolean): void {
    if (typeof document === 'undefined') return;
    if (open) {
        document.documentElement.setAttribute(TX_LITE_MENU_OPEN_ATTR, '1');
        return;
    }
    document.documentElement.removeAttribute(TX_LITE_MENU_OPEN_ATTR);
}

/** يغلق أي قائمة خفيفة مفتوحة. true = اُستهلك الرجوع ولا تُكمِل مكدس المركز */
export function closeTransactionsLiteMenuIfOpen(): boolean {
    if (!isTransactionsLiteMenuOpen()) return false;
    document.dispatchEvent(new Event(TX_LITE_MENU_CLOSE_EVENT));
    return true;
}
