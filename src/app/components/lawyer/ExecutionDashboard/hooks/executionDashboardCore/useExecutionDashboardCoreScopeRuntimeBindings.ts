/** Phase C — ربط runtime قبل تجميع scope bags */
import { useCallback, useMemo } from 'react';
import type { ExecutionFile, TimelineEvent, SeizedAsset } from '@/app/types/execution';
import type { ExecutorApprovalActions } from '../../executionDashboardRuntimeChunkScope';

export type UseExecutionDashboardCoreScopeRuntimeBindingsParams = {
    isEvictionExecutionModule: boolean;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    file: ExecutionFile | null | undefined;
    executorApprovalActions: ExecutorApprovalActions;
    total_execution_expenses: number;
    setSeizedAssets: (next: SeizedAsset[]) => void;
    seizureDraftsByDecisionId: Record<string, unknown>;
    setSeizureDraftsByDecisionId: (next: Record<string, unknown>) => void;
    activeCoerciveActions: unknown[];
    setActiveCoerciveActions: (next: unknown[]) => void;
};

export function useExecutionDashboardCoreScopeRuntimeBindings({
    isEvictionExecutionModule,
    executionData,
    executionId,
    file,
    executorApprovalActions,
    total_execution_expenses,
    setSeizedAssets,
    seizureDraftsByDecisionId,
    setSeizureDraftsByDecisionId,
    activeCoerciveActions,
    setActiveCoerciveActions,
}: UseExecutionDashboardCoreScopeRuntimeBindingsParams) {
    const insertTimelineEventToSupabase = useCallback(
        (params: {
            executionFileId: string;
            event: TimelineEvent;
            snapshotData?: unknown;
        }) => {
            void import('@/app/services/timelineEventsSupabase')
                .then(({ insertTimelineEventToSupabase: insert }) => insert(params))
                .catch(() => {});
        },
        [],
    );

    const syncSeizedAssets = useCallback((next: SeizedAsset[]) => setSeizedAssets(next), [setSeizedAssets]);
    const syncSeizureDrafts = useCallback(
        (next: typeof seizureDraftsByDecisionId) => setSeizureDraftsByDecisionId(next),
        [setSeizureDraftsByDecisionId],
    );
    const syncActiveCoerciveActions = useCallback(
        (next: typeof activeCoerciveActions) => setActiveCoerciveActions(next),
        [setActiveCoerciveActions],
    );

    const evictionExecutorWorkflow = useMemo(
        () =>
            isEvictionExecutionModule
                ? {
                      dossierId: String(executionData?.id ?? executionId ?? file?.id ?? 'default'),
                      actions: executorApprovalActions,
                  }
                : undefined,
        [isEvictionExecutionModule, executionData?.id, executionId, file?.id, executorApprovalActions],
    );

    const seizedAssetsModalExecutionId = executionId || file?.id;
    const totalExecutionExpenses = total_execution_expenses;
    const initialFileNumber = String(executionData?.fileNumber || '').trim();

    return {
        insertTimelineEventToSupabase,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        seizedAssetsModalExecutionId,
        totalExecutionExpenses,
        initialFileNumber,
    };
}
