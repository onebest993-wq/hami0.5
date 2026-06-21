/**
 * Lightweight LCP / CLS sampling via PerformanceObserver (no extra deps).
 * Dev-only by default — use on real devices with USB remote debugging + console.
 */

type VitalSample = { name: string; value: number; id?: string };

function safeObserve(
    type: string,
    callback: (entry: PerformanceEntry) => void
): PerformanceObserver | null {
    if (typeof PerformanceObserver === 'undefined') return null;
    try {
        const po = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                callback(entry);
            }
        });
        po.observe({ type, buffered: true } as PerformanceObserverInit);
        return po;
    } catch {
        return null;
    }
}

let lastLcp = 0;
let clsScore = 0;
let teardown: (() => void) | null = null;

/**
 * Logs rolling vitals to the console (DEV). Does not change UI.
 * Returns a cleanup function that removes observers and event listeners.
 */
export function initWebVitalsLogging(): () => void {
    if (import.meta.env.PROD) return () => {};

    if (teardown) return teardown;

    const observers: PerformanceObserver[] = [];

    const lcpObs = safeObserve('largest-contentful-paint', (entry) => {
        const e = entry as PerformanceEntry & { renderTime?: number; loadTime?: number };
        const v = e.renderTime || e.loadTime || e.startTime || 0;
        if (v >= lastLcp) {
            lastLcp = v;
            console.debug('[WebVitals] LCP (ms)', Math.round(lastLcp));
        }
    });
    if (lcpObs) observers.push(lcpObs);

    const clsObs = safeObserve('layout-shift', (entry) => {
        const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (e.hadRecentInput) return;
        clsScore += e.value ?? 0;
    });
    if (clsObs) observers.push(clsObs);

    const onVisibility = () => {
        if (document.visibilityState === 'hidden') {
            const summary: VitalSample[] = [
                { name: 'LCP_ms', value: Math.round(lastLcp) },
                { name: 'CLS', value: Number(clsScore.toFixed(4)) },
            ];
            console.debug('[WebVitals] session summary', summary);
        }
    };
    window.addEventListener('visibilitychange', onVisibility);

    teardown = () => {
        observers.forEach((o) => o.disconnect());
        window.removeEventListener('visibilitychange', onVisibility);
        teardown = null;
    };
    return teardown;
}
