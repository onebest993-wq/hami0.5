/** كشف/إخفاء طبقة البحث الدافئة — data-attributes فقط؛ CSS يتحكم بالرؤية */

const WARM_SELECTOR = '[data-search-warm="true"]';
const SHELL_SELECTOR = '[data-hami-global-search-shell]';

function resolveWarmLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const warm = document.querySelector(WARM_SELECTOR);
    if (warm instanceof HTMLElement) return warm;
    const shell = document.querySelector(`${SHELL_SELECTOR} [data-testid="global-search-overlay"]`);
    return shell?.parentElement instanceof HTMLElement ? shell.parentElement : null;
}

/** يزيل inline reveal/conceal العالق — يمنع !important من حجب إعادة الفتح */
export function clearGlobalSearchLayerImperativeStyles(el: HTMLElement): void {
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('opacity');
}

/** كشف الطبقة الدافئة قبل flushSync — يزيل فجوة الإطار الأول */
export function revealGlobalSearchWarmShell(): boolean {
    const root = resolveWarmLayer();
    if (!root) return false;
    clearGlobalSearchLayerImperativeStyles(root);
    root.setAttribute('data-search-open', 'true');
    root.removeAttribute('aria-hidden');
    root.removeAttribute('inert');
    void root.offsetHeight;
    return true;
}

/** إخفاء فوري عند الإغلاق مع الإبقاء على keepAlive — بلا inline !important */
export function concealGlobalSearchWarmShell(): void {
    const root = resolveWarmLayer();
    if (!root) return;
    clearGlobalSearchLayerImperativeStyles(root);
    root.setAttribute('data-search-open', 'false');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
}

/**
 * يؤجّل إزالة علم html/conceal حتى يُعاد رسم الرئيسية —
 * يمنع وميض الخلفية المعتمة عند الإغلاق.
 */
export function scheduleGlobalSearchCloseConceal(run: () => void): void {
    if (typeof window === 'undefined') {
        run();
        return;
    }
    window.requestAnimationFrame(() => {
        window.requestAnimationFrame(run);
    });
}
