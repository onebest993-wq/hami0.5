import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyInstrumentDetailsSection = createPreloadableLazyComponent(() =>
    import('./InstrumentDetailsSection').then((m) => ({
        default: m.InstrumentDetailsSection,
    })),
);

export function prefetchInstrumentDetailsSection(): void {
    void LazyInstrumentDetailsSection.preload();
}
