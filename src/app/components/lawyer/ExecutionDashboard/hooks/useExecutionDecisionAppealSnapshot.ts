import { useMemo } from 'react';
import { executionRowAppealPipelineActive } from '@/app/utils/executionDecisionAppealActive';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

interface UseExecutionDecisionAppealSnapshotParams {
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
}

/** قرارات المنفذ + أول طعن نشط — منطق محلي فقط. */
export function useExecutionDecisionAppealSnapshot(params: UseExecutionDecisionAppealSnapshotParams) {
    const { decisionsStorageExecutionId, decisionsReloadEpoch } = params;

    const executorDecisions = useMemo(
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
        if (!Array.isArray(executorDecisions)) return false;
        return executorDecisions.some(
            (r) => r?.requestKind === 'unified_collection' && r?.executorOutcome === 'approved',
        );
    }, [executorDecisions]);

    return {
        executorDecisions,
        firstActiveAppealDecisionId,
        hasApprovedCollectionDecision,
    };
}
