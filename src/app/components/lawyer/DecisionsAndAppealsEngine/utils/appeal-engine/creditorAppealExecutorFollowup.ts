import type { Decision } from '../../types';
import {
    type AppealUiPerspective,
} from '../../appealUiLabels';
import {
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
    isDecisionLikeRow,
} from '../appealRequestOrigin';


import {
    appealPipelineRowForCard,
    isLawyerCassationNaqdResume,
    isLawyerCassationRadReset,
} from './decisionHubPipeline';
import {
    isCassationAffirmResult,
} from './appealProceedings';


import type {
    CreditorRequestAppealGate,
    ExecutorRequestFollowupBlock,
} from './appealTypes';
import { resolveCreditorRequestAppealGate } from './creditorAppealGate';
import { resolveCreditorDecisionEnforcementState } from './creditorAppealEnforcement';

export function resolveExecutorRequestFollowupGate(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): CreditorRequestAppealGate {
    if (!isDecisionLikeRow(hub)) return { kind: 'continue' };
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    return resolveCreditorRequestAppealGate(hubRow, pipe, perspective, all);
}

export function resolveExecutorRequestFollowupBlock(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestFollowupBlock | null {
    if (!isDecisionLikeRow(hub)) return null;
    const hubRow = hubWithInferredAppealOrigin(hub);
    if (isExecutorRequestAppealCycleSuperseded(hubRow, all, perspective)) return null;
    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    if (gate.kind === 'paused' || gate.kind === 'lifecycle_reset' || gate.kind === 'revoked') {
        return gate;
    }
    return null;
}

export function isExecutorRequestFollowupBlocked(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!isDecisionLikeRow(hub)) return false;
    if (isExecutorRequestAppealCycleSuperseded(hub, all, perspective)) return false;
    const kind = resolveExecutorRequestFollowupGate(hub, all, perspective).kind;
    return kind === 'paused' || kind === 'lifecycle_reset' || kind === 'revoked';
}

/**
 * أُعيدت دورة الطلب (تمييز / استغناء / نقض) — لا يُحسب الطلب السابق «قائماً» لمنع طلب جديد.
 * يختلف عن الإيقاف المؤقت (قبول تظلم بانتظار تمييز) حيث يبقى الطلب محجوزاً.
 */
export function isExecutorRequestAppealCycleSuperseded(
    hub: Decision | null | undefined,
    all: Decision[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!isDecisionLikeRow(hub)) return false;
    if ((hub as Decision).requestCycleSuperseded === true) return true;
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipeEarly = appealPipelineRowForCard(hubRow, all);
    const workflowEarly = String(pipeEarly.appealWorkflowState ?? hubRow.appealWorkflowState ?? '').trim();
    if (workflowEarly === 'REVOKED_BY_APPEAL') return true;

    const noAppealEarly = pipeEarly.noAppealChosen === true || hubRow.noAppealChosen === true;
    const appealFinalEarly = pipeEarly.appealStatus === 'final' || hubRow.appealStatus === 'final';
    if (
        noAppealEarly &&
        appealFinalEarly &&
        (hubRow.executorOutcome === 'rejected' || pipeEarly.executorOutcome === 'rejected')
    ) {
        return true;
    }
    const grievanceAcceptedEarly =
        pipeEarly.appealResult === 'قبول التظلم' || hubRow.appealResult === 'قبول التظلم';
    if (noAppealEarly && appealFinalEarly && grievanceAcceptedEarly) return true;

    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    if (gate.kind === 'paused') return false;
    if (gate.kind === 'lifecycle_reset' || gate.kind === 'revoked') return true;

    const grievanceFinalEarly = String(pipeEarly.appealResult ?? hubRow.appealResult ?? '').trim();
    if (
        grievanceFinalEarly === 'قبول التظلم' &&
        (pipeEarly.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        return true;
    }

    const appealResult = String(pipeEarly.appealResult ?? hubRow.appealResult ?? '').trim();
    const appealStatus = pipeEarly.appealStatus ?? hubRow.appealStatus;
    if (appealStatus === 'final' && appealResult === 'نقض القرار') {
        if (!isLawyerCassationNaqdResume(pipeEarly, hubRow)) return true;
    }
    if (appealStatus === 'final' && isCassationAffirmResult(appealResult)) {
        if (isLawyerCassationRadReset(pipeEarly, hubRow.executorOutcome)) return true;
    }

    const logs = [
        ...(Array.isArray(hubRow.appealTimelineLogs) ? hubRow.appealTimelineLogs : []),
        ...(Array.isArray(pipeEarly.appealTimelineLogs) ? pipeEarly.appealTimelineLogs : []),
    ];
    if (
        logs.some((l) =>
            /دون تمييز|دون طعن|لا حاجة للطعن|لا حاجة للتمييز/.test(String(l.message || ''))
        )
    ) {
        return true;
    }

    /** طعن نهائي والقرار غير نافذ — أُغلقت دورة الطلب (تمييز/تصديق/رفض نهائي) */
    if (
        appealFinalEarly &&
        isCreditorInitiatedExecutorRequest(hubRow)
    ) {
        const state = resolveCreditorDecisionEnforcementState(hubRow, pipeEarly, {
            hubTab: 'previous',
            appealLegallyFinal: true,
            needsExecutor: false,
            appealPerspective: perspective,
        });
        if (!state.enforced && state.visual !== 'paused') {
            return true;
        }
    }

    return false;
}

export function isExecutorRequestAppealCycleSupersededFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || typeof row !== 'object') return false;
    return isExecutorRequestAppealCycleSuperseded(
        row as unknown as Decision,
        all as unknown as Decision[],
        perspective,
    );
}

export function isExecutorRequestFollowupBlockedFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || typeof row !== 'object') return false;
    return isExecutorRequestFollowupBlocked(
        row as unknown as Decision,
        all as unknown as Decision[],
        perspective,
    );
}

export function resolveExecutorRequestFollowupBlockFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestFollowupBlock | null {
    if (!row || typeof row !== 'object') return null;
    return resolveExecutorRequestFollowupBlock(
        row as unknown as Decision,
        all as unknown as Decision[],
        perspective,
    );
}
