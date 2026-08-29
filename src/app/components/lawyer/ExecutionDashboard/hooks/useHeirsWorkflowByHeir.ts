import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

type HeirWorkflowByHeirEntry = NonNullable<
    NonNullable<ExecutionFile['heirs_notification_workflow']>['byHeir']
>[string];

export function useHeirsWorkflowByHeir(
    executionData: ExecutionFile | null | undefined,
    activeDebtorHeirsForNotification: string[],
    normalizeHeirWorkflowKey: (name: string) => string,
): Record<string, HeirWorkflowByHeirEntry> {
    return useMemo(() => {
        const raw = executionData?.heirs_notification_workflow?.byHeir || {};
        const next: Record<string, HeirWorkflowByHeirEntry> = {};
        activeDebtorHeirsForNotification.forEach((heirName) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prev = (raw[key] || {}) as Partial<HeirWorkflowByHeirEntry>;
            const normalizedSummonStatus =
                String(prev.summonStatus || 'none') === 'expired'
                    ? 'none'
                    : (prev.summonStatus ?? 'none');
            next[key] = {
                heirName,
                memoDate: prev.memoDate ?? null,
                memoStatus: prev.memoStatus ?? 'none',
                summonDate: prev.summonDate ?? null,
                summonStatus: normalizedSummonStatus,
                investigationRequestStatus: 'none',
                investigationDecisionStatus: 'none',
                investigationDecisionId: null,
                arrestWarrantStatus: 'none',
                lastActionAt: prev.lastActionAt ?? null,
            };
        });
        return next;
    }, [executionData?.heirs_notification_workflow?.byHeir, activeDebtorHeirsForNotification, normalizeHeirWorkflowKey]);
}
