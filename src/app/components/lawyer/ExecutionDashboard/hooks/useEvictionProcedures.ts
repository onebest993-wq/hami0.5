import { useCallback } from 'react';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';

interface AppendEvictionProcedureInput {
    actionId: EvictionTimelineActionId;
    title: string;
    description: string;
}

export function useEvictionProcedures(
    evictionProcedureLocked: boolean,
    decisionsStorageExecutionId: string,
    EVICTION_WORKFLOW_BY_ACTION_ID: Record<string, EvictionExecutorWorkflowKey>,
    appendEvictionExecutorRequest: (request: {
        executionId: string;
        title: string;
        body: string;
        requestKind: 'eviction_procedure';
        evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    }) => boolean,
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: {
            decisionsLink?: boolean;
            decisionId?: string;
            decisionsTab?: 'current' | 'previous' | 'appeals';
        }
    ) => void,
) {
    const appendEvictionProcedure = useCallback(
        (input: AppendEvictionProcedureInput) => {
            if (evictionProcedureLocked) {
                showToast('الإضبارة موقوفة — لا يمكن تسجيل الإجراء.', 'warning');
                return;
            }

            const ok = appendEvictionExecutorRequest({
                executionId: decisionsStorageExecutionId,
                title: input.title,
                body: input.description,
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: EVICTION_WORKFLOW_BY_ACTION_ID[input.actionId],
            });
            if (!ok) {
                showToast('يوجد طلب مماثل بانتظار بتّ المنفذ.', 'warning');
                return;
            }
            showToast('تم إنشاء الطلب — قرار المنفذ يظهر داخل نفس البطاقة.', 'info');
        },
        [
            evictionProcedureLocked,
            decisionsStorageExecutionId,
            EVICTION_WORKFLOW_BY_ACTION_ID,
            appendEvictionExecutorRequest,
            showToast,
        ]
    );

    return { appendEvictionProcedure };
}
