import { lazy } from 'react';

const executionPhoneBodyImport = () =>
    import('./components/ExecutionDashboardPhoneBody').then((m) => ({
        default: m.ExecutionDashboardPhoneBody,
    }));

export const LazyExecutionDashboardPhoneBody = lazy(executionPhoneBodyImport);

export function prefetchExecutionDashboardPhoneBody(): void {
    void executionPhoneBodyImport().catch(() => undefined);
}
