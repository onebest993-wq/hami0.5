import { prefetchFuseModule } from '@/app/services/globalSearchFuse';
import { prefetchGlobalSearchIndexWorker } from '@/app/services/globalSearchIndexRuntime';

type GlobalSearchOverlayModule = typeof import('@/app/components/lawyer/GlobalSearchOverlay');

let overlayModulePromise: Promise<GlobalSearchOverlayModule> | null = null;

/** تحميل مسبق لـ chunk البحث + fuse.js + worker — يُستدعى عند hover أو بعد mount اللوحة. */
export function prefetchGlobalSearchOverlay(): void {
    if (typeof window === 'undefined') return;
    prefetchFuseModule();
    prefetchGlobalSearchIndexWorker();
    if (!overlayModulePromise) {
        overlayModulePromise = import('@/app/components/lawyer/GlobalSearchOverlay');
    }
}

export function loadGlobalSearchOverlayModule(): Promise<GlobalSearchOverlayModule> {
    prefetchGlobalSearchOverlay();
    return overlayModulePromise!;
}
