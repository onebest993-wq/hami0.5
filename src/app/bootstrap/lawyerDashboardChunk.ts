import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { onBootContentReady } from '@/app/bootstrap/bootReveal';
import {
    loadLawyerDashboardModule,
    resetLawyerDashboardModuleCache,
} from '@/app/runtime/lawyerDashboardLoader';

let chunkMarked = false;
let headerWarmArmed = false;

/** بلا bootMetrics→debug على مسار Gate قبل TTFI */
function markChunkLoadedOnce(): void {
    if (chunkMarked) return;
    chunkMarked = true;
    if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
        try {
            performance.mark('hami:boot:dashboard-chunk-loaded');
        } catch {
            /* ignore */
        }
    }
}

/**
 * بعد content-ready فقط — لا تنافس شبكة مع HomeTab + deferred-app قبل كشف الشعار.
 * (كان على interactive فيسرق bandwidth من first-tab/wall)
 */
function armHeaderShellWarmAfterContentReady(): void {
    if (typeof window === 'undefined' || headerWarmArmed) return;
    headerWarmArmed = true;
    onBootContentReady(() => {
        void import('@/app/hooks/lawyerDashboard/headerShellIntentWarm').then((m) => {
            m.preloadLawyerDashboardHeaderShellChunks();
        });
    });
}

/**
 * تحميل فوري لـ chunk اللوحة — يُستدعى من index.tsx مع أول إطار (موازٍ لـ App/React).
 * بلا تسخين هيدر أثناء stem.
 */
export function preloadLawyerDashboardChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    return loadLawyerDashboardModule()
        .then(() => {
            markChunkLoadedOnce();
            armHeaderShellWarmAfterContentReady();
        })
        .catch((err) => {
            chunkMarked = false;
            if (import.meta.env.DEV) {
                console.warn('[preloadLawyerDashboardChunk] failed:', err);
            }
        });
}

/** تحميل مسبق idle — احتياطي إذا فُوّت preload المبكر */
export function scheduleLawyerDashboardPrefetch(): void {
    if (typeof window === 'undefined') return;

    const run = () => {
        void preloadLawyerDashboardChunk();
    };

    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(run, { timeout: 400 });
    } else {
        window.setTimeout(run, 0);
    }
}

export function resetLawyerDashboardChunkPreload(): void {
    chunkMarked = false;
    headerWarmArmed = false;
    resetLawyerDashboardModuleCache();
}

export const LawyerDashboardLazy = lazyWithRetry(() =>
    loadLawyerDashboardModule().then((mod) => {
        markChunkLoadedOnce();
        armHeaderShellWarmAfterContentReady();
        return { default: mod.LawyerDashboard as unknown as LazyComponent };
    }),
);
