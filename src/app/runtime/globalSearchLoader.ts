import type { ComponentProps, ComponentType } from 'react';

type GlobalSearchOverlayModule = typeof import('@/app/components/lawyer/GlobalSearchOverlay/index');
type GlobalSearchOverlayProps = ComponentProps<GlobalSearchOverlayModule['GlobalSearchOverlay']>;
type GlobalSearchOverlayComponent = ComponentType<GlobalSearchOverlayProps>;

import {
    markGlobalSearchOverlayModuleResolved,
    resetGlobalSearchOverlayModuleStateForTests,
} from '@/app/runtime/globalSearchModuleState';

export {
    isGlobalSearchOverlayModuleResolved,
    resetGlobalSearchOverlayModuleStateForTests,
} from '@/app/runtime/globalSearchModuleState';

type GlobalSearchOverlayHostModule =
    typeof import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost');

let overlayModulePromise: Promise<GlobalSearchOverlayModule> | null = null;
let cachedGlobalSearchOverlay: GlobalSearchOverlayComponent | null = null;
let dashboardEntryPrefetchPromise: Promise<unknown> | null = null;
let overlayHostPromise: Promise<GlobalSearchOverlayHostModule> | null = null;

export function getCachedGlobalSearchOverlay(): GlobalSearchOverlayComponent | null {
    return cachedGlobalSearchOverlay;
}

/** للاختبارات */
export function resetGlobalSearchOverlayModuleCacheForTests(): void {
    overlayModulePromise = null;
    cachedGlobalSearchOverlay = null;
    dashboardEntryPrefetchPromise = null;
    overlayHostPromise = null;
    resetGlobalSearchOverlayModuleStateForTests();
}

function ensureOverlayModulePromise(): Promise<GlobalSearchOverlayModule> {
    if (!overlayModulePromise) {
        overlayModulePromise = import('@/app/components/lawyer/GlobalSearchOverlay/index')
            .then((mod) => {
                if (mod?.GlobalSearchOverlay) {
                    cachedGlobalSearchOverlay = mod.GlobalSearchOverlay;
                }
                markGlobalSearchOverlayModuleResolved();
                return mod;
            })
            .catch((err) => {
                overlayModulePromise = null;
                throw err;
            });
    }
    return overlayModulePromise;
}

/**
 * chunk Entry في MainView (LazyGlobalSearchOverlayEntry) — غير GlobalSearchOverlay.
 * بدونه أول فتح يدفع Suspense فارغ حتى يكتمل تحميل الـ Entry.
 */
export function prefetchGlobalSearchDashboardEntryChunk(): void {
    if (typeof window === 'undefined') return;
    if (!dashboardEntryPrefetchPromise) {
        dashboardEntryPrefetchPromise = import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry'
        ).catch(() => {
            dashboardEntryPrefetchPromise = null;
        });
    }
}

/** Fuse + worker — ثقيل؛ يُؤجَّل بعد ظهور الـ shell أو idle. Motion يُحمَّل مع الواجهة. */
export function prefetchGlobalSearchSearchEngine(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/services/globalSearchFuse').then((m) => {
        m.prefetchFuseModule();
    });
    void import('@/app/services/search/globalSearchIndexWorkerClient').then((m) =>
        m.prefetchGlobalSearchIndexWorker(),
    );
}

/** قشرة الطلاء الفوري فقط — لا تسحب Host/Overlay بعد الإقلاع. */
export function prefetchGlobalSearchInstantPaintCover(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover').catch(
        () => undefined,
    );
}

function ensureOverlayHostPromise(): Promise<GlobalSearchOverlayHostModule> {
    if (!overlayHostPromise) {
        overlayHostPromise = import(
            '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost'
        ).catch((err) => {
            overlayHostPromise = null;
            throw err;
        });
    }
    return overlayHostPromise;
}

/** Host (يسحب الواجهة) — مسار الفتح، لا Entry اللوحة. */
export function loadGlobalSearchOverlayHost(): Promise<GlobalSearchOverlayHostModule> {
    return ensureOverlayHostPromise();
}

/** مقطع الواجهة الكامل — عند نية الفتح (hover/ضغط)، لا بعد interactive. */
export function prefetchGlobalSearchOverlayChunk(): void {
    if (typeof window === 'undefined') return;
    prefetchGlobalSearchInstantPaintCover();
    prefetchGlobalSearchDashboardEntryChunk();
    void ensureOverlayHostPromise().catch(() => undefined);
    void ensureOverlayModulePromise().catch(() => undefined);
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

/** يضمن جاهزية واجهة البحث للفتح الفوري */
export function hydrateGlobalSearchOverlayForInstantOpen(): Promise<boolean> {
    return ensureOverlayModulePromise()
        .then(() => true)
        .catch(() => false);
}
