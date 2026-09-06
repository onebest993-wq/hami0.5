import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyInstrumentDetailsSection = createPreloadableLazyComponent(() =>
    import('./InstrumentDetailsSection').then((m) => ({
        default: m.InstrumentDetailsSection,
    })),
);

export function prefetchInstrumentDetailsSection(): Promise<void> {
    return LazyInstrumentDetailsSection.preload().catch(() => undefined);
}
