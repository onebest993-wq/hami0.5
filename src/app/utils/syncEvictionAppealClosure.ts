// @ts-nocheck
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    appealPipelineRowForCard,
    hubWithInferredAppealOrigin,
    isExecutorRequestAppealCycleSupersededFromRecord,
    resolveCreditorDecisionEnforcementState,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { fieldVisitAppointmentStorageKey, inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import SecureStoreService from '@/app/services/SecureStoreService';

/** بعد اكتمال الطعن — أرشفة بطاقة التخلية وإزالة أعلام عالقة */
export function syncEvictionAppealClosureIfNeeded(input: {
    executionId: string | undefined;
    row: Record<string, unknown> | null | undefined;
    allDecisions?: Record<string, unknown>[];
    forceClose?: boolean;
}): void {
    const executionId = String(input.executionId ?? '').trim();
    const row = input.row;
    if (!executionId || !row || typeof row !== 'object') return;
    if (String(row.requestKind || '') !== 'eviction_procedure') return;

    const all = input.allDecisions ?? [];
    if (
        !input.forceClose &&
        !isExecutorRequestAppealCycleSupersededFromRecord(row, all)
    ) {
        return;
    }

    const hub = hubWithInferredAppealOrigin(row as Decision);
    const pipe = appealPipelineRowForCard(hub, all as Decision[]);
    const state = resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab: 'previous',
        appealLegallyFinal: true,
        needsExecutor: false,
    });
    if (state.enforced) return;

    const decisionId = String((row as { id?: string }).id ?? '').trim();
    if (decisionId && (row as { requestCycleSuperseded?: boolean }).requestCycleSuperseded !== true) {
        const now = new Date().toISOString();
        patchExecutorDecisionRow(executionId, decisionId, {
            requestCycleSuperseded: true,
            requestCycleSupersededAt: now,
            isArchived: true,
        });
    }

    const branch = inferExecutorApprovalDecisionType({
        title: String((row as { title?: string }).title || ''),
        requestKind: 'eviction_procedure',
        evictionWorkflowKey: (row as { evictionWorkflowKey?: string }).evictionWorkflowKey,
    });
    if (branch === 'Field Visit Date') {
        try {
            SecureStoreService.deleteItemSync(fieldVisitAppointmentStorageKey(executionId));
        } catch {
            /* ignore */
        }
    }
}
