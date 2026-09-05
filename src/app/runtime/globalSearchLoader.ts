import { markGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchModuleState';
import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export { isGlobalSearchOverlayModuleResolved } from '@/app/runtime/globalSearchModuleState';

type GlobalSearchOverlayModule = typeof import('@/app/components/lawyer/GlobalSearchOverlay/index');
type GlobalSearchOverlayHostModule =
    typeof import('@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost');

let overlayModulePromise: Promise<GlobalSearchOverlayModule> | null = null;
let overlayHostPromise: Promise<GlobalSearchOverlayHostModule> | null = null;

function ensureOverlayModulePromise(): Promise<GlobalSearchOverlayModule> {
    if (!overlayModulePromise) {
        overlayModulePromise = import('@/app/components/lawyer/GlobalSearchOverlay/index')
            .then((mod) => {
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

export const LazyGlobalSearchOverlayEntry = createPreloadableLazyComponent(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardGlobalSearchOverlayEntry as unknown as LazyComponent,
    })),
);

/**
 * chunk Entry في MainView (LazyGlobalSearchOverlayEntry) — غير GlobalSearchOverlay.
 * بدونه أول فتح يدفع Suspense فارغ حتى يكتمل تحميل الـ Entry.
 */
export function prefetchGlobalSearchDashboardEntryChunk(): void {
    if (typeof window === 'undefined') return;
    void LazyGlobalSearchOverlayEntry.preload();
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
    void import('@/app/components/lawyer/dashboard/overlayInstantChromeLazy')
        .then((m) => m.LazyGlobalSearchInstantPaintCover.preload())
        .catch(() => undefined);
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

function prefetchGlobalSearchOverlay(): void {
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
