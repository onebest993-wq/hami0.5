import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { preloadLawyerDashboardHeaderShellChunks } from '@/app/hooks/lawyerDashboard/headerShellIntentWarm';
import {
    loadLawyerDashboardModule,
    resetLawyerDashboardModuleCache,
} from '@/app/runtime/lawyerDashboardLoader';

let chunkMarked = false;

function markChunkLoadedOnce(): void {
    if (chunkMarked) return;
    chunkMarked = true;
    markBootPhase('dashboard-chunk-loaded');
}

/** تحميل فوري لـ chunk اللوحة — يُستدعى من index.tsx قبل أول render */
export function preloadLawyerDashboardChunk(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    preloadLawyerDashboardHeaderShellChunks();
    return loadLawyerDashboardModule()
        .then(() => {
            markChunkLoadedOnce();
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
    resetLawyerDashboardModuleCache();
}

export const LawyerDashboardLazy = lazyWithRetry(() =>
    loadLawyerDashboardModule().then((mod) => {
        markChunkLoadedOnce();
        return { default: mod.LawyerDashboard as unknown as LazyComponent };
    }),
);
