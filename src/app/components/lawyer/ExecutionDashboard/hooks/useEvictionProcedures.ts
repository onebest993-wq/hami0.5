import { useCallback, useMemo } from 'react';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';
import {
    appendEvictionProcedureRequest,
    type AppendEvictionProcedureInput,
} from '@/app/utils/appendEvictionProcedureRequest';
import { appendEvictionExecutorRequest as appendEvictionExecutorRequestRaw } from '@/app/utils/executorSeizureDecisionQueue';

export function useEvictionProcedures(
    evictionProcedureLocked: boolean,
    decisionsStorageExecutionId: string,
    _EVICTION_WORKFLOW_BY_ACTION_ID: Record<string, EvictionExecutorWorkflowKey>,
    _appendEvictionExecutorRequest: Parameters<typeof appendEvictionProcedureRequest>[0]['appendEvictionExecutorRequest'],
    showToast: Parameters<typeof appendEvictionProcedureRequest>[0]['showToast'],
    executionData?: Record<string, unknown> | null,
) {
    const appendEvictionExecutorRequest = useMemo(
        () =>
            (request: Parameters<typeof appendEvictionExecutorRequestRaw>[0]) =>
                appendEvictionExecutorRequestRaw({
                    ...request,
                    executionData: request.executionData ?? executionData ?? null,
                }),
        [executionData],
    );

    const appendEvictionProcedure = useCallback(
        (input: AppendEvictionProcedureInput) =>
            appendEvictionProcedureRequest(
                {
                    locked: evictionProcedureLocked,
                    decisionsStorageExecutionId,
                    executionData,
                    appendEvictionExecutorRequest,
                    showToast,
                },
                input,
            ),
        [
            evictionProcedureLocked,
            decisionsStorageExecutionId,
            executionData,
            appendEvictionExecutorRequest,
            showToast,
        ],
    );

    return { appendEvictionProcedure };
}

