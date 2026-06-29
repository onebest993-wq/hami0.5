type GlobalSearchOverlayModule = typeof import('@/app/components/lawyer/GlobalSearchOverlay');

import {
    markGlobalSearchOverlayModuleResolved,
    resetGlobalSearchOverlayModuleStateForTests,
} from '@/app/runtime/globalSearchModuleState';

export {
    isGlobalSearchOverlayModuleResolved,
    resetGlobalSearchOverlayModuleStateForTests,
} from '@/app/runtime/globalSearchModuleState';

let overlayModulePromise: Promise<GlobalSearchOverlayModule> | null = null;

function ensureOverlayModulePromise(): Promise<GlobalSearchOverlayModule> {
    if (!overlayModulePromise) {
        overlayModulePromise = import('@/app/components/lawyer/GlobalSearchOverlay').then((mod) => {
            markGlobalSearchOverlayModuleResolved();
            return mod;
        });
    }
    return overlayModulePromise;
}

/** تحميل مسبق لـ chunk واجهة البحث فقط — خفيف للإقلاع ومسار الفتح. */
export function prefetchGlobalSearchOverlayChunk(): void {
    if (typeof window === 'undefined') return;
    void ensureOverlayModulePromise();
}

/** Fuse + worker + motion — ثقيل؛ يُؤجَّل بعد ظهور الـ shell أو idle. */
export function prefetchGlobalSearchSearchEngine(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/services/globalSearchFuse').then((m) => m.prefetchFuseModule());
    void import('@/app/services/search/globalSearchIndexWorkerClient').then((m) =>
        m.prefetchGlobalSearchIndexWorker(),
    );
    void import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayMotionShell');
}

/** chunk فوراً + محرك البحث في microtask — لا يحجب الإقلاع. */
export function prefetchGlobalSearchOverlay(): void {
    prefetchGlobalSearchOverlayChunk();
    if (typeof window === 'undefined') return;
    queueMicrotask(() => prefetchGlobalSearchSearchEngine());
}

/** للفتح من الهيدر: ينتظر chunk الواجهة فقط — بلا fuse/worker على المسار الحرج. */
export function loadGlobalSearchOverlayModule(): Promise<GlobalSearchOverlayModule> {
    prefetchGlobalSearchOverlayChunk();
    return ensureOverlayModulePromise();
}

/** تحميل كامل (واجهة + محرك) — للتسخين بعد جاهزية اللوحة فقط. */
export function loadGlobalSearchOverlayWithEngine(): Promise<GlobalSearchOverlayModule> {
    prefetchGlobalSearchOverlay();
    return ensureOverlayModulePromise();
}
