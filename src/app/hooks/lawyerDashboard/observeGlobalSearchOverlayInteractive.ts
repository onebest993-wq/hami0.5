export type ObserveGlobalSearchOverlayInteractiveInput = {
    onInteractive: () => void;
    isDone: () => boolean;
};

const OVERLAY_SELECTOR = '[data-testid="global-search-overlay"]';
const INPUT_SELECTOR = '[data-testid="global-search-input"]';
const SHELL_ROOT = '[data-hami-global-search-shell]';

/** مراقبة محدودة لطبقة البحث — بلا document.body (أداء موبايل). */
export function observeGlobalSearchOverlayInteractive({
    onInteractive,
    isDone,
}: ObserveGlobalSearchOverlayInteractiveInput): () => void {
    let rafId = 0;

    const tryMark = () => {
        if (isDone() || (typeof document !== 'undefined' && document.hidden)) return;
        const overlay = document.querySelector(OVERLAY_SELECTOR);
        const input = document.querySelector(INPUT_SELECTOR);
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
    obs?.observe(anchor, { childList: true, subtree: true });

    const onVisibility = () => {
        if (!document.hidden) scheduleTry();
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
