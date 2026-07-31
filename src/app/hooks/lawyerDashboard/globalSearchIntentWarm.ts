import type { WarmGlobalSearchInput } from '@/app/services/globalSearchWarm';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { shouldAllowIntentWarmFromDom } from '@/app/services/settings/intentWarmGate';

export type GlobalSearchWarmSnapshot = WarmGlobalSearchInput;

let snapshotProvider: (() => GlobalSearchWarmSnapshot | null) | null = null;

function resolveWarmSnapshot(): GlobalSearchWarmSnapshot | null {
    return snapshotProvider?.() ?? null;
}

function canWarmGlobalSearchExtras(): boolean {
    if (typeof document !== 'undefined' && document.hidden) return false;
    if (!shouldAllowIntentWarmFromDom()) return false;
    if (isLitePerformanceActive()) return false;
    return true;
}

function warmExtras(uid: string): void {
    void import('@/app/services/globalSearchLoad')
        .then((m) => m.warmGlobalSearchExtras(uid))
        .catch(() => undefined);
}

function loadGlobalSearchLoader() {
    return import('@/app/runtime/globalSearchLoader');
}

function loadGlobalSearchWarm() {
    return import('@/app/services/globalSearchWarm');
}

/** يُحدَّث من runtime effects — لقطة حية عبر provider بدون effect عند كل تغيير ملف */
export function registerGlobalSearchWarmSnapshot(input: GlobalSearchWarmSnapshot): void {
    snapshotProvider = () => input;
}

export function registerGlobalSearchWarmSnapshotProvider(
    provider: () => GlobalSearchWarmSnapshot | null,
): void {
    snapshotProvider = provider;
}

export function clearGlobalSearchWarmSnapshot(): void {
    snapshotProvider = null;
}

/** عند hover/لمس أيقونة البحث: chunk فوراً؛ المحرك/الفهرس فقط خارج وضع lite. */
export function warmGlobalSearchOnHover(): void {
    if (typeof window === 'undefined') return;
    if (!shouldAllowIntentWarmFromDom()) return;
    const lite = isLitePerformanceActive();
    void loadGlobalSearchLoader()
        .then((m) => {
            m.prefetchGlobalSearchOverlayChunk();
            if (!lite) m.prefetchGlobalSearchSearchEngine();
        })
        .catch(() => undefined);
    if (lite) return;
    const snap = resolveWarmSnapshot();
    const uid = snap?.userId;
    if (uid && canWarmGlobalSearchExtras()) {
        warmExtras(uid);
    }
    if (snap) {
        void loadGlobalSearchWarm()
            .then((m) => m.warmGlobalSearchPipeline(snap, false))
            .catch(() => undefined);
    }
}

/**
 * عند فتح البحث: chunk فوراً + محرك + فهرس أساسي idle في الخلفية (بلا حجب الـ shell).
 * الفهرس الكامل يُكمَّل داخل GlobalSearchRuntimeProvider عند الحاجة.
 */
export function warmGlobalSearchOnOpen(): void {
    void loadGlobalSearchLoader()
        .then((m) => {
            m.prefetchGlobalSearchOverlayChunk();
            m.prefetchGlobalSearchSearchEngine();
        })
        .catch(() => undefined);
    const snap = resolveWarmSnapshot();
    const uid = snap?.userId;
    if (uid && canWarmGlobalSearchExtras()) {
        warmExtras(uid);
    }
    /* فهرس أساسي idle — لا يحجب أول لمسة للـ shell */
    queueMicrotask(() => {
        const live = resolveWarmSnapshot();
        if (!live || (typeof document !== 'undefined' && document.hidden)) return;
        void loadGlobalSearchWarm()
            .then((m) => m.warmGlobalSearchPipeline(live, false))
            .catch(() => undefined);
    });
}
