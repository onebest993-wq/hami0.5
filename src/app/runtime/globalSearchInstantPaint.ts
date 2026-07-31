/** كشف/إخفاء طبقة البحث الدافئة فوراً في الـ DOM — قبل التزام React */

const WARM_SELECTOR = '[data-search-warm="true"]';
const SHELL_SELECTOR = '[data-hami-global-search-shell]';

function resolveWarmLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const warm = document.querySelector(WARM_SELECTOR);
    if (warm instanceof HTMLElement) return warm;
    const shell = document.querySelector(`${SHELL_SELECTOR} [data-testid="global-search-overlay"]`);
    return shell?.parentElement instanceof HTMLElement ? shell.parentElement : null;
}

/** كشف الطبقة الدافئة قبل flushSync — يزيل فجوة الإطار الأول */
export function revealGlobalSearchWarmShell(): boolean {
    const root = resolveWarmLayer();
    if (!root) return false;
    root.style.setProperty('visibility', 'visible');
    root.style.setProperty('pointer-events', 'auto');
    root.setAttribute('data-search-open', 'true');
    root.removeAttribute('aria-hidden');
    root.removeAttribute('inert');
    void root.offsetHeight;
    return true;
}

/** إخفاء فوري عند الإغلاق مع الإبقاء على keepAlive */
export function concealGlobalSearchWarmShell(): void {
    const root = resolveWarmLayer();
    if (!root) return;
    root.style.setProperty('visibility', 'hidden');
    root.style.setProperty('pointer-events', 'none');
    root.setAttribute('data-search-open', 'false');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
}
