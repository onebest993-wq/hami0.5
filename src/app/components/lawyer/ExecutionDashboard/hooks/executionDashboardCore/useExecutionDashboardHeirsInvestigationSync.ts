import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { mergeHeirInvestigationDecisionStatuses } from './executionDashboardHeirsAndDeceasedSync';
import type { ExecutorDecisionRowLite } from './executionDashboardPersonalCoerciveDecisionSync';

export function useExecutionDashboardHeirsInvestigationSync({
    executionData,
    decisionsStorageExecutionId,
    decisionsReloadEpoch,
    persistExecutionMerge,
}: {
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
}) {
    useEffect(() => {
        if (!executionData?.id) return;
        const byHeir = executionData?.heirs_notification_workflow?.byHeir || {};
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId) as ExecutorDecisionRowLite[];
        const nextByHeir = mergeHeirInvestigationDecisionStatuses(byHeir, rows);
        if (!nextByHeir) return;
        persistExecutionMerge({
            heirs_notification_workflow: {
                hasReceivedInitialNotice: true,
                byHeir: nextByHeir,
            },
        });
    }, [
        executionData?.id,
        executionData?.heirs_notification_workflow?.byHeir,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        persistExecutionMerge,
    ]);
}
