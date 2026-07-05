import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let scheduled = false;
let loaded = false;

/** CSS للأقسام lazy الثقيلة — بعد shell أو عند intent. */
export function scheduleDeferredFeatureStyles(): void {
    if (scheduled || loaded || typeof window === 'undefined') return;
    scheduled = true;

    const load = () => {
        loaded = true;
        void import('@/styles/deferred-features.css');
    };

    const idleTimeout = isCapacitorNativePlatform() ? 8_000 : 12_000;

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(load, { timeout: idleTimeout });
    } else {
        window.setTimeout(load, isCapacitorNativePlatform() ? 3_000 : 2_000);
    }
}

export function prefetchDeferredFeatureStyles(): void {
    if (loaded || typeof window === 'undefined') return;
    scheduleDeferredFeatureStyles();
}

/** يُحمّل CSS أقسام المنتدى فوراً — يمنع قفز الألوان بعد ثوانٍ */
export function ensureDeferredFeatureStylesLoaded(): void {
    if (loaded || typeof window === 'undefined') return;
    scheduled = true;
    loaded = true;
    void import('@/styles/deferred-features.css');
}

export function resetDeferredFeatureStylesForTests(): void {
    scheduled = false;
    loaded = false;
}
