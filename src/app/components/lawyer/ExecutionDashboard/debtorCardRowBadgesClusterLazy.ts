import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { DebtorCardRowBadgesClusterProps } from './components/DebtorCardRowBadgesCluster.types';

export function importDebtorCardRowBadgesCluster() {
    return import('./components/DebtorCardRowBadgesCluster').then((m) => ({
        default: m.DebtorCardRowBadgesCluster,
    }));
}

export const LazyDebtorCardRowBadgesCluster =
    createPreloadableLazyComponent<DebtorCardRowBadgesClusterProps>(importDebtorCardRowBadgesCluster);

export function prefetchDebtorCardRowBadgesCluster(): void {
    void LazyDebtorCardRowBadgesCluster.preload();
}
