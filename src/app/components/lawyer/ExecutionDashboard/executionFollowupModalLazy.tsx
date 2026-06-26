import { lazy } from 'react';

const executionFollowupModalPortalImport = () =>
    import('./ExecutionFollowupModalPortal').then((m) => ({
        default: m.ExecutionFollowupModalPortal,
    }));

export const LazyExecutionFollowupModalPortal = lazy(executionFollowupModalPortalImport);

export function prefetchExecutionFollowupModalPortal(): void {
    void executionFollowupModalPortalImport().catch(() => undefined);
}
