export type ObserveNotificationPanelInteractiveInput = {
    onInteractive: () => void;
    isDone: () => boolean;
};

const PANEL_SELECTOR = '[data-testid="notification-panel"]';
const SHELL_ROOT = '[data-hami-notification-shell]';

/** مراقبة محدودة للوحة الإشعارات — بلا document.body (أداء موبايل). */
export function observeNotificationPanelInteractive({
    onInteractive,
    isDone,
}: ObserveNotificationPanelInteractiveInput): () => void {
    let rafId = 0;

    const tryMark = () => {
        if (isDone() || (typeof document !== 'undefined' && document.hidden)) return;
        const panel = document.querySelector(PANEL_SELECTOR);
        const tab = panel?.querySelector('[data-testid="notification-tab-forum"]');
        if (!panel || !tab) return;
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
