/**
 * مصدر واحد لمزامنة سريان أي طلب منفّذ مع مركز القرارات والطعون.
 */
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import {
    appealPipelineRowForCard,
    hubWithInferredAppealOrigin,
    isExecutorRequestAppealCycleSupersededFromRecord,
    resolveCreditorDecisionEnforcementState,
    resolveExecutorRequestFollowupBlockFromRecord,
    resolveExecutorRequestFollowupGate,
    type CreditorRequestAppealGate,
    type ExecutorRequestFollowupBlock,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    isExecutorRowEffectivelyApproved,
} from '@/app/utils/executorDecisionRowApproval';
import { readExecutorDecisionsArray } from '@/app/utils/executorDecisionStorageRead';

export type ExecutorRequestAppealSyncView = {
    governingRow: Record<string, unknown> | null;
    decisionId: string | null;
    gate: CreditorRequestAppealGate;
    followupBlock: ExecutorRequestFollowupBlock | null;
    blocked: boolean;
    blocksFieldwork: boolean;
    blocksSubmit: boolean;
    cycleSuperseded: boolean;
    enforced: boolean;
    pillLabel: string;
};

const EMPTY_CONTINUE: CreditorRequestAppealGate = { kind: 'continue' };

function rowId(row: Record<string, unknown> | null | undefined): string | null {
    const id = String((row as { id?: string } | null)?.id ?? '').trim();
    return id || null;
}

function isAppealLegallyFinal(hub: Decision, pipe: Decision): boolean {
    const workflow = String(pipe.appealWorkflowState ?? hub.appealWorkflowState ?? '').trim();
    return (
        pipe.appealStatus === 'final' ||
        hub.appealStatus === 'final' ||
        workflow === 'FINAL_ACCEPTED' ||
        workflow === 'FINAL_REJECTED' ||
        workflow === 'REVOKED_BY_APPEAL'
    );
}

/** يفسّر النفاذ/التوقيف/إنهاء الدورة لأي صف قرار منفّذ */
export function resolveExecutorRequestAppealSyncFromRow(
    row: Record<string, unknown> | null | undefined,
    allDecisions: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestAppealSyncView {
    const governingRow = row && typeof row === 'object' ? row : null;
    const decisionId = rowId(governingRow);

    if (!governingRow) {
        return {
            governingRow: null,
            decisionId: null,
            gate: EMPTY_CONTINUE,
            followupBlock: null,
            blocked: false,
            blocksFieldwork: false,
            blocksSubmit: false,
            cycleSuperseded: false,
            enforced: false,
            pillLabel: '',
        };
    }

    const gate = resolveExecutorRequestFollowupGate(
        governingRow as unknown as Decision,
        allDecisions as unknown as Decision[],
        perspective
    );
    const hub = hubWithInferredAppealOrigin(governingRow as unknown as Decision);
    const pipe = appealPipelineRowForCard(hub, allDecisions as unknown as Decision[]);
    const appealFinal = isAppealLegallyFinal(hub, pipe);
    const enforcement = resolveCreditorDecisionEnforcementState(hub, pipe, {
        hubTab: 'previous',
        appealLegallyFinal: appealFinal,
        needsExecutor: String(governingRow.executorOutcome ?? 'pending') === 'pending',
        appealPerspective: perspective,
        allDecisions: allDecisions as unknown as Decision[],
    });
    const cycleSuperseded = isExecutorRequestAppealCycleSupersededFromRecord(
        governingRow,
        allDecisions
    );
    const followupBlock = cycleSuperseded
        ? null
        : resolveExecutorRequestFollowupBlockFromRecord(
              governingRow,
              allDecisions,
              perspective
          );
    const approvedRow = isExecutorRowEffectivelyApproved(governingRow);
    const blocked =
        !cycleSuperseded &&
        (gate.kind === 'paused' ||
            gate.kind === 'revoked' ||
            (approvedRow && !enforcement.enforced));

    return {
        governingRow,
        decisionId,
        gate,
        followupBlock,
        blocked,
        blocksFieldwork: blocked,
        blocksSubmit: blocked,
        cycleSuperseded,
        enforced: enforcement.enforced,
        pillLabel: enforcement.pillLabel,
    };
}

/** هل الطلب نافذ فعلياً بعد موافقة المنفذ ومسار الطعن؟ */
export function isExecutorDecisionRowEffectivelyEnforced(
    row: Record<string, unknown> | null | undefined,
    allDecisions: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    return resolveExecutorRequestAppealSyncFromRow(row, allDecisions, perspective).enforced;
}

/** هل يُسمح بإجراءات ما بعد الموافقة (تسجيل نتيجة / إكمال بيانات / شارة نافذة)؟ */
export function isExecutorRowApprovedWorkflowActive(
    row: Record<string, unknown> | null | undefined,
    allDecisions: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || !isExecutorRowEffectivelyApproved(row)) return false;
    const sync = resolveExecutorRequestAppealSyncFromRow(row, allDecisions, perspective);
    return sync.enforced && !sync.cycleSuperseded && !sync.blocksFieldwork;
}

/** اختصار عند توفر معرف التخزين فقط */
export function isExecutorRowApprovedWorkflowActiveForExecution(
    row: Record<string, unknown> | null | undefined,
    executionId: string | undefined,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    const exId = String(executionId || '').trim();
    if (!exId) return false;
    return isExecutorRowApprovedWorkflowActive(
        row,
        readExecutorDecisionsArray(exId) as Record<string, unknown>[],
        perspective
    );
}

export function isExecutorDecisionRowEffectivelyEnforcedForExecution(
    row: Record<string, unknown> | null | undefined,
    executionId: string | undefined,
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    const exId = String(executionId || '').trim();
    if (!exId) return false;
    return isExecutorDecisionRowEffectivelyEnforced(
        row,
        readExecutorDecisionsArray(exId) as Record<string, unknown>[],
        perspective
    );
}
