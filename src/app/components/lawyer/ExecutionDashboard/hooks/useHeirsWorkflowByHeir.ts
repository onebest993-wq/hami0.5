import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';

export function useHeirsWorkflowByHeir(
    executionData: ExecutionFile | null | undefined,
    activeDebtorHeirsForNotification: string[],
    normalizeHeirWorkflowKey: (name: string) => string,
): Record<string, any> {
    return useMemo(() => {
        const raw = executionData?.heirs_notification_workflow?.byHeir || {};
        const next: Record<string, any> = {};
        activeDebtorHeirsForNotification.forEach((heirName) => {
            const key = normalizeHeirWorkflowKey(heirName);
            if (!key) return;
            const prev = (raw[key] || {}) as {
                memoDate?: string | null;
                memoStatus?: string;
                summonDate?: string | null;
                summonStatus?: string;
                lastActionAt?: string | null;
            };
            const normalizedSummonStatus =
                String(prev.summonStatus || 'none') === 'expired' ? 'none' : (prev.summonStatus ?? 'none');
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
