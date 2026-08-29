import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyActiveOrderModalQuickLog = createPreloadableLazyComponent(() =>
    import('../../Modal_Quick_Log').then((m) => ({
        default: m.Modal_Quick_Log,
    })),
);

/** Prefetch Quick Log قبل فتح تبليغ القرار — نية الزر في تظلّم التوقيت. */
export function preloadActiveOrderQuickLog(): void {
    void LazyActiveOrderModalQuickLog.preload();
}
