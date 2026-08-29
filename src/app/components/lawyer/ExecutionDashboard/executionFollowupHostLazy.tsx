import { createPreloadableLazyComponent } from '@/app/utils/lazy/preloadableLazy';
import type { FollowupModalSnapshot } from './followupModalContext';

type ExecutionFollowupModalHostProps = {
    open: boolean;
    snapshot: FollowupModalSnapshot;
};

export const LazyExecutionFollowupModalHost =
    createPreloadableLazyComponent<ExecutionFollowupModalHostProps>(() =>
        import('./components/ExecutionFollowupModalHost').then((m) => ({
            default: m.ExecutionFollowupModalHost,
        })),
    );

export function prefetchExecutionFollowupModalHost(): void {
    void LazyExecutionFollowupModalHost.preload();
}
