import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { WarmGlobalSearchInput } from '@/app/services/globalSearchWarm';
import {
    prefetchGlobalSearchOverlay,
    prefetchGlobalSearchOverlayChunk,
    prefetchGlobalSearchSearchEngine,
} from '@/app/runtime/globalSearchLoader';

export type GlobalSearchWarmSnapshot = WarmGlobalSearchInput;

let snapshot: GlobalSearchWarmSnapshot | null = null;

/** يُحدَّث من runtime effects عند توفر بيانات مساحة العمل — بدون تسخين تلقائي عند الإقلاع. */
export function registerGlobalSearchWarmSnapshot(input: GlobalSearchWarmSnapshot): void {
    snapshot = input;
}

export function clearGlobalSearchWarmSnapshot(): void {
    snapshot = null;
}

/** عند hover/لمس أيقونة البحث: chunk + محرك مؤجَّل + فهرس idle. */
export function warmGlobalSearchOnHover(): void {
    prefetchGlobalSearchOverlay();
    const uid = snapshot?.userId;
    if (uid) {
        void import('@/app/services/globalSearchLoad').then((m) => m.warmGlobalSearchExtras(uid));
    }
    if (snapshot) {
        void import('@/app/services/globalSearchWarm').then((m) => m.warmGlobalSearchPipeline(snapshot, false));
    }
}

/**
 * عند فتح البحث: chunk فوراً + محرك + فهرس أساسي idle في الخلفية (بلا حجب الـ shell).
 * الفهرس الكامل يُكمَّل داخل GlobalSearchRuntimeProvider عند الحاجة.
 */
export function warmGlobalSearchOnOpen(): void {
    prefetchGlobalSearchOverlayChunk();
    const uid = snapshot?.userId;
    if (uid && typeof document !== 'undefined' && !document.hidden) {
        void import('@/app/services/globalSearchLoad').then((m) => m.warmGlobalSearchExtras(uid));
    }
    queueMicrotask(() => {
        prefetchGlobalSearchSearchEngine();
        if (!snapshot || (typeof document !== 'undefined' && document.hidden)) return;
        void import('@/app/services/globalSearchWarm').then((m) =>
            m.warmGlobalSearchPipeline(snapshot, false),
        );
    });
}
