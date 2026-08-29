import type { MutableRefObject } from 'react';
import { isExecutionHandlerStubLeaf } from '../hooks/executionHandlerClusterStubs';
import { runDebtorEmploymentToggle } from '../hooks/executionDashboardCore/executionDashboardDebtorEmploymentToggle';

export function buildPhoneBodyDebtorEmploymentToggleHandler(
    scopeRef: MutableRefObject<Record<string, unknown>> | undefined,
    fallbackSource: Record<string, unknown>,
): (payload: { debtorKey: string; isPrimary: boolean }) => void {
    return (payload) => {
        const live = (scopeRef?.current ?? fallbackSource) as Record<string, unknown>;
        const clusterFn = live.handleDebtorEmploymentToggle;
        if (typeof clusterFn === 'function' && !isExecutionHandlerStubLeaf(clusterFn)) {
            (clusterFn as (ctx: { debtorKey: string; isPrimary: boolean }) => void)(payload);
            return;
        }
        const s = live as Record<string, unknown>;
        runDebtorEmploymentToggle({
            base: (s.executionData ?? s.viewExecutionData) as import('@/app/types/execution').ExecutionFile | null,
            debtorWorkspaceEntries: Array.isArray(s.debtorWorkspaceEntries)
                ? s.debtorWorkspaceEntries
                : [],
            ctx: payload,
            nextTimelineId:
                typeof s.nextTimelineId === 'function'
                    ? s.nextTimelineId
                    : () => `timeline-${Date.now()}`,
            persistExecutionMerge:
                typeof s.persistExecutionMerge === 'function' ? s.persistExecutionMerge : () => false,
            showToast:
                typeof s.showToast === 'function'
                    ? s.showToast
                    : () => undefined,
            setTimelineEvents:
                typeof s.setTimelineEvents === 'function' ? s.setTimelineEvents : undefined,
        });
    };
}
