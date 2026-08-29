import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyPartiesSection = createPreloadableLazyComponent(() =>
    import('./PartiesSection').then((m) => ({
        default: m.PartiesSection,
    })),
);

export function prefetchPartiesSection(): void {
    void LazyPartiesSection.preload();
}
