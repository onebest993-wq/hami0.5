import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';

export const LazyJudicialCustodianCardMenu = createPreloadableLazyComponent(() =>
    import('@/app/components/lawyer/execution/JudicialCustodianCardMenu').then((m) => ({
        default: m.JudicialCustodianCardMenu,
    })),
);
