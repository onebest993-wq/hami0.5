import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let scheduled = false;
let loaded = false;
let loadPromise: Promise<void> | null = null;

/** CSS للأقسام lazy الثقيلة — بعد shell أو عند intent. */
export function scheduleDeferredFeatureStyles(): void {
    if (scheduled || loaded || typeof window === 'undefined') return;
    scheduled = true;

    const load = () => {
        void ensureDeferredFeatureStylesLoaded();
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

/**
 * يُحمّل CSS أقسام المنتدى فوراً وينتظر اكتماله —
 * يمنع `.border` الحرج من الظهور بلون currentColor أبيض قبل وصول utilities المؤجّلة.
 */
export function ensureDeferredFeatureStylesLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (loaded) return Promise.resolve();
    if (loadPromise) return loadPromise;

    scheduled = true;
    loadPromise = import('@/styles/deferred-features.css')
        .then(() => {
            loaded = true;
        })
        .catch(() => {
            /* أعد المحاولة لاحقاً */
            loadPromise = null;
        });

    return loadPromise ?? Promise.resolve();
}

export function resetDeferredFeatureStylesForTests(): void {
    scheduled = false;
    loaded = false;
    loadPromise = null;
}
