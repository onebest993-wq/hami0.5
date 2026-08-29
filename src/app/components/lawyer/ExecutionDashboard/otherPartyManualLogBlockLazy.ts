import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { OtherPartyActionsLogProps } from '@/app/components/lawyer/execution/otherPartyActionsLog/otherPartyActionsLogModel';

export const LazyManualOtherPartyLogBlock =
    createPreloadableLazyComponent<OtherPartyActionsLogProps>(() =>
        import('@/app/components/lawyer/execution/OtherPartyActionsLog').then((m) => ({
            default: m.ManualOtherPartyLogBlock,
        })),
    );

export function prefetchManualOtherPartyLogBlock(): void {
    void LazyManualOtherPartyLogBlock.preload();
}
