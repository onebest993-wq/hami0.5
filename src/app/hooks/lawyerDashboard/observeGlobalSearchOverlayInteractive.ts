export type ObserveGlobalSearchOverlayInteractiveInput = {
    onInteractive: () => void;
    isDone: () => boolean;
};

/** طبقة مفتوحة فقط — لا تُحسب keepWarm المخفية تفاعلاً */
export const GLOBAL_SEARCH_OPEN_OVERLAY_SELECTOR =
    '[data-search-open="true"] [data-testid="global-search-overlay"], [data-testid="global-search-overlay"][data-search-open="true"], [data-search-instant-shell="true"]';
export const GLOBAL_SEARCH_OPEN_INPUT_SELECTOR =
    '[data-search-open="true"] [data-testid="global-search-input"], [data-search-instant-shell="true"] [data-testid="global-search-input"]';
const SHELL_ROOT = '[data-hami-global-search-shell]';

/** مراقبة محدودة لطبقة البحث — بلا document.body (أداء موبايل). */
export function observeGlobalSearchOverlayInteractive({
    onInteractive,
    isDone,
}: ObserveGlobalSearchOverlayInteractiveInput): () => void {
    let rafId = 0;

    const tryMark = () => {
        if (isDone()) return;
        const overlay = document.querySelector(GLOBAL_SEARCH_OPEN_OVERLAY_SELECTOR);
        const input = document.querySelector(GLOBAL_SEARCH_OPEN_INPUT_SELECTOR);
        if (!overlay || !input) return;
        onInteractive();
    };

    const scheduleTry = () => {
        if (isDone()) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tryMark);
    };

    tryMark();
    if (isDone()) return () => undefined;

    const anchor = document.querySelector(SHELL_ROOT);
    const obs =
        anchor &&
        new MutationObserver(() => {
            scheduleTry();
        });
    if (anchor && obs) obs.observe(anchor, { childList: true, subtree: true });

    const onVisibility = () => {
        if (document.visibilityState !== 'hidden') scheduleTry();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const timeout = window.setTimeout(tryMark, 30_000);

    return () => {
        cancelAnimationFrame(rafId);
        obs?.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        window.clearTimeout(timeout);
    };
}
