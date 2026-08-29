import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyGuarantorExternalHub = createPreloadableLazyComponent(() =>
    import('./components/GuarantorExternalHub').then((m) => ({
        default: m.GuarantorExternalHub,
    })),
);
