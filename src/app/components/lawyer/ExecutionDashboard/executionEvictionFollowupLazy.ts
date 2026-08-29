import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { EvictionFollowupModalsChunkProps } from './components/EvictionFollowupModalsChunk.types';

export const LazyEvictionExpenseFollowupModal = createPreloadableLazyComponent(() =>
    import('./components/EvictionExpenseFollowupModal').then((m) => ({
        default: m.EvictionExpenseFollowupModal,
    })),
);

export const LazyEvictionLawyerFeeFollowupModal = createPreloadableLazyComponent(() =>
    import('./components/EvictionLawyerFeeFollowupModal').then((m) => ({
        default: m.EvictionLawyerFeeFollowupModal,
    })),
);

export const LazyEvictionResidentialGraceFollowupModal = createPreloadableLazyComponent(() =>
    import('./components/EvictionResidentialGraceFollowupModal').then((m) => ({
        default: m.EvictionResidentialGraceFollowupModal,
    })),
);

export const LazyEvictionFollowupModalsChunk =
    createPreloadableLazyComponent<EvictionFollowupModalsChunkProps>(() =>
        import('./components/EvictionFollowupModalsChunk').then((m) => ({
            default: m.EvictionFollowupModalsChunk,
        })),
    );

export function prefetchEvictionFollowupSurfaces(): void {
    void LazyEvictionFollowupModalsChunk.preload();
    void LazyEvictionExpenseFollowupModal.preload();
    void LazyEvictionLawyerFeeFollowupModal.preload();
    void LazyEvictionResidentialGraceFollowupModal.preload();
}
