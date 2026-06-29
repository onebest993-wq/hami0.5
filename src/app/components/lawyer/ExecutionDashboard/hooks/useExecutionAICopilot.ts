import { useMemo } from 'react';
import { executionRowAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

interface UseExecutionAICopilotParams {
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
}

/** قرارات المنفذ + أول طعن نشط — بدون مسار AI copilot (أُزيل في V1). */
export function useExecutionAICopilot(params: UseExecutionAICopilotParams) {
    const { decisionsStorageExecutionId, decisionsReloadEpoch } = params;

    const executionCopilotDecisions = useMemo(
        () => readExecutorDecisionsArray(decisionsStorageExecutionId),
        [decisionsStorageExecutionId, decisionsReloadEpoch],
    );

    const firstActiveAppealDecisionId = useMemo(() => {
        const rows = readExecutorDecisionsArray(decisionsStorageExecutionId);
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (executionRowAppealPipelineActive(r)) {
                const id = r.id;
                if (typeof id === 'string' && id) return id;
            }
        }
        return null;
    }, [decisionsStorageExecutionId, decisionsReloadEpoch]);

    const hasApprovedCollectionDecision = useMemo(() => {
        if (!Array.isArray(executionCopilotDecisions)) return false;
        return executionCopilotDecisions.some(
            (r) => r?.requestKind === 'unified_collection' && r?.executorOutcome === 'approved',
        );
    }, [executionCopilotDecisions]);

    return {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        hasApprovedCollectionDecision,
    };
}
