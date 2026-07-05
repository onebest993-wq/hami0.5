import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { WarmGlobalSearchInput } from '@/app/services/globalSearchWarm';
import {
    prefetchGlobalSearchOverlay,
    prefetchGlobalSearchOverlayChunk,
    prefetchGlobalSearchSearchEngine,
} from '@/app/runtime/globalSearchLoader';

export type GlobalSearchWarmSnapshot = WarmGlobalSearchInput;

let snapshotProvider: (() => GlobalSearchWarmSnapshot | null) | null = null;

function resolveWarmSnapshot(): GlobalSearchWarmSnapshot | null {
    return snapshotProvider?.() ?? null;
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

/** عند hover/لمس أيقونة البحث: chunk + محرك مؤجَّل + فهرس idle. */
export function warmGlobalSearchOnHover(): void {
    prefetchGlobalSearchOverlay();
    const snap = resolveWarmSnapshot();
    const uid = snap?.userId;
    if (uid) {
        void import('@/app/services/globalSearchLoad').then((m) => m.warmGlobalSearchExtras(uid));
    }
    if (snap) {
        void import('@/app/services/globalSearchWarm').then((m) => m.warmGlobalSearchPipeline(snap, false));
    }
}

/**
 * عند فتح البحث: chunk فوراً + محرك + فهرس أساسي idle في الخلفية (بلا حجب الـ shell).
 * الفهرس الكامل يُكمَّل داخل GlobalSearchRuntimeProvider عند الحاجة.
 */
export function warmGlobalSearchOnOpen(): void {
    prefetchGlobalSearchOverlayChunk();
    const snap = resolveWarmSnapshot();
    const uid = snap?.userId;
    if (uid && typeof document !== 'undefined' && !document.hidden) {
        void import('@/app/services/globalSearchLoad').then((m) => m.warmGlobalSearchExtras(uid));
    }
    queueMicrotask(() => {
        prefetchGlobalSearchSearchEngine();
        const live = resolveWarmSnapshot();
        if (!live || (typeof document !== 'undefined' && document.hidden)) return;
        void import('@/app/services/globalSearchWarm').then((m) =>
            m.warmGlobalSearchPipeline(live, false),
        );
    });
}
