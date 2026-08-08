import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';

import {

    EVICTION_WORKFLOW_BY_ACTION_ID,

    type EvictionExecutorWorkflowKey,

} from '@/app/utils/executorApprovalWorkflow';

import { gateExecutorRequestPersist } from '@/app/utils/executionDomainIsolation';

import type { EvictionRequestKind } from '@/app/utils/executorSeizureDecisionQueue';

import { hasBlockingEvictionProcedureDuplicate } from '@/app/utils/executorSeizureDecisionQueue';
import { resolveAllEvictionAppealSync } from '@/app/utils/evictionAppealSync';
import { readExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import {
    assertEvictionBranchSubmitAllowed,
    createEmptyEvictionAppealSyncView,
    getEvictionAppealBranchForActionId,
} from '@/app/utils/evictionBranchSignals';



export type AppendEvictionProcedureInput = {

    actionId: EvictionTimelineActionId;

    title: string;

    description: string;

    supersedeCompletedHub?: boolean;

};



type AppendEvictionProcedureRequestDeps = {

    locked: boolean;

    decisionsStorageExecutionId: string;

    executionData?: Record<string, unknown> | null;

    appendEvictionExecutorRequest: (request: {

        executionId: string;

        title: string;

        body: string;

        requestKind: EvictionRequestKind;

        evictionWorkflowKey?: EvictionExecutorWorkflowKey;

        supersedeCompletedHub?: boolean;

        executionData?: Record<string, unknown> | null;

    }) => boolean;

    showToast: (

        message: string,

        type: 'success' | 'error' | 'warning' | 'info',

        options?: {

            decisionsLink?: boolean;

            decisionId?: string;

            decisionsTab?: 'current' | 'previous' | 'appeals';

        },

    ) => void;

};



export function appendEvictionProcedureRequest(

    deps: AppendEvictionProcedureRequestDeps,

    input: AppendEvictionProcedureInput,

): boolean {

    if (deps.locked) {

        deps.showToast('الإضبارة موقوفة — لا يمكن تسجيل الإجراء.', 'warning');

        return false;

    }



    if (typeof deps.appendEvictionExecutorRequest !== 'function') {

        deps.showToast('تعذر إرسال الطلب — الأدوات لم تكتمل التحميل بعد.', 'warning');

        return false;

    }



    const gate = gateExecutorRequestPersist(deps.decisionsStorageExecutionId, 'eviction_procedure', {

        executionData: deps.executionData,

    });

    if (!gate.allowed) {

        deps.showToast(

            gate.reasonAr || 'هذا الإجراء غير متاح في مسار هذه الإضبارة',

            'warning',

        );

        return false;

    }

    const appealBranch = getEvictionAppealBranchForActionId(input.actionId);
    if (appealBranch) {
        const rows = readExecutorDecisionsUnionForExecution(
            deps.decisionsStorageExecutionId,
            deps.executionData,
        );
        const sync =
            resolveAllEvictionAppealSync({
                executionId: deps.decisionsStorageExecutionId,
                allDecisions: rows,
            })[appealBranch] ?? createEmptyEvictionAppealSyncView(appealBranch);
        const submitGuard = assertEvictionBranchSubmitAllowed(sync);
        if (!submitGuard.ok) {
            deps.showToast(submitGuard.message, 'warning', {
                decisionsLink: Boolean(sync.decisionId),
                decisionId: sync.decisionId ?? undefined,
                decisionsTab: sync.decisionsNav?.decisionsTab,
            });
            return false;
        }
    }

    const workflowKey = EVICTION_WORKFLOW_BY_ACTION_ID[input.actionId];

    const ok = deps.appendEvictionExecutorRequest({

        executionId: deps.decisionsStorageExecutionId,

        title: input.title,

        body: input.description,

        requestKind: 'eviction_procedure',

        evictionWorkflowKey: workflowKey,

        supersedeCompletedHub: input.supersedeCompletedHub,

        executionData: deps.executionData,

    });

    if (!ok) {

        if (

            hasBlockingEvictionProcedureDuplicate(deps.decisionsStorageExecutionId, {

                evictionWorkflowKey: workflowKey,

                title: input.title,

            }, deps.executionData)

        ) {

            deps.showToast('يوجد طلب مماثل بانتظار بتّ المنفذ.', 'warning', {

                decisionsLink: true,

            });

            return false;

        }

        deps.showToast('تعذر إنشاء الطلب. أعد المحاولة أو راجع مركز القرارات.', 'warning');

        return false;

    }

    deps.showToast(
        input.supersedeCompletedHub
            ? 'تم تقديم طلب جديد — يظهر داخل البطاقة.'
            : 'تم إنشاء الطلب — قرار المنفذ يظهر داخل نفس البطاقة.',
        'info',
        { decisionsLink: true },
    );
    return true;
}


