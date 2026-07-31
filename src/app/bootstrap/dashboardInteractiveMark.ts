/**
 * علامة TTFI فقط — بلا debug/reveal/storage حتى لا تُسحب لـ LD stem.
 * باقي مراحل الإقلاع تبقى في bootMetrics.ts.
 */

export const DASHBOARD_INTERACTIVE_EVENT = 'hami:dashboard-interactive';

const MARK_NAME = 'hami:boot:dashboard-interactive';

let dashboardInteractiveMarked = false;

export function isDashboardInteractive(): boolean {
    if (dashboardInteractiveMarked) return true;
    if (typeof performance === 'undefined') return false;
    return performance.getEntriesByName(MARK_NAME, 'mark').length > 0;
}

export function getDashboardInteractiveMs(): number | null {
    if (typeof performance === 'undefined') return null;
    const start = performance.getEntriesByName('hami:boot:start', 'mark')[0];
    const interactive = performance.getEntriesByName(MARK_NAME, 'mark')[0];
    if (!interactive) return null;
    const originMs = start?.startTime ?? 0;
    return Math.round(interactive.startTime - originMs);
}

function exposeTtfiProbe(): void {
    if (typeof window === 'undefined') return;
    try {
        (window as Window & { __hamiTtfiMs?: number | null }).__hamiTtfiMs =
            getDashboardInteractiveMs();
    } catch {
        /* ignore */
    }
}

/** يُطلق مرة واحدة — mark + حدث `hami:dashboard-interactive`. */
export function markDashboardInteractiveOnce(): void {
    if (isDashboardInteractive()) {
        dashboardInteractiveMarked = true;
        exposeTtfiProbe();
        return;
    }
    dashboardInteractiveMarked = true;
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        try {
            performance.mark(MARK_NAME);
        } catch {
            /* ignore */
        }
    }
    exposeTtfiProbe();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(DASHBOARD_INTERACTIVE_EVENT));
    }
}

/** يُشغّل `run` بعد dashboard-interactive (أو فوراً إن سبق). */
export function onDashboardInteractive(run: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    if (isDashboardInteractive()) {
        queueMicrotask(run);
        return () => undefined;
    }
    const handler = () => run();
    window.addEventListener(DASHBOARD_INTERACTIVE_EVENT, handler, { once: true });
    return () => window.removeEventListener(DASHBOARD_INTERACTIVE_EVENT, handler);
}

/** للاختبارات — إعادة ضبط حالة interactive */
export function resetDashboardInteractiveForTests(): void {
    dashboardInteractiveMarked = false;
}
