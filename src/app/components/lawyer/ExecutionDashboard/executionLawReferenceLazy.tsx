import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { LawReferencePanelProps } from './components/LawReferencePanel';

export const LazyLawReferencePanel = createPreloadableLazyComponent<LawReferencePanelProps>(() =>
    import('./components/LawReferencePanel').then((m) => ({ default: m.LawReferencePanel })),
);

export function prefetchLawReferencePanel(): void {
    void import('@/app/utils/executionLawRemoteCache')
        .then((m) => {
            m.prefetchExecutionLawArticlesRemote();
        })
        .catch(() => undefined);
    void import('@/data/executionLawsLoader')
        .then((m) => {
            void m.loadExecutionLawSeedData().catch(() => undefined);
        })
        .catch(() => undefined);
    void LazyLawReferencePanel.preload();
}
