import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorLedgerEnforcementState } from './manualExecutorLedger';
import {
    appealPipelineRowForCard,
    effectiveExecutorOutcomeForCreditorHubPill,
    isLawyerCassationNaqdResume,
    isLawyerCassationRadReset,
} from './decisionHubPipeline';
import {
    resolveEffectiveAwaitingCassationParty,
    resolveEffectiveAppealActor,
    isCassationAffirmResult,
} from './appealProceedings';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
    isDebtorAppealEligibleApprovedHub,
    resolveAppealBaseBranch,
} from './appealWorkflowActors';
import type {
    CreditorRequestAppealGate,
    CreditorDecisionEnforcementState,
    DecisionHubStatusPillTone,
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
    const gate = resolveExecutorRequestFollowupGate(hubRow, all, perspective);
    if (gate.kind === 'paused') return false;
    if (gate.kind === 'lifecycle_reset' || gate.kind === 'revoked') return true;

    const pipeEarly = appealPipelineRowForCard(hubRow, all);
    const grievanceFinalEarly = String(pipeEarly.appealResult ?? hubRow.appealResult ?? '').trim();
    if (
        grievanceFinalEarly === 'قبول التظلم' &&
        (pipeEarly.appealStatus === 'final' || hubRow.appealStatus === 'final')
    ) {
        return true;
    }

    const pipe = appealPipelineRowForCard(hubRow, all);
    const workflow = String(pipe.appealWorkflowState ?? hubRow.appealWorkflowState ?? '').trim();
    if (workflow === 'REVOKED_BY_APPEAL') return true;

    const appealResult = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    const appealStatus = pipe.appealStatus ?? hubRow.appealStatus;
    if (appealStatus === 'final' && appealResult === 'نقض القرار') {
        if (!isLawyerCassationNaqdResume(pipe, hubRow)) return true;
    }
    if (appealStatus === 'final' && isCassationAffirmResult(appealResult)) {
        if (isLawyerCassationRadReset(pipe, hubRow.executorOutcome)) return true;
    }

    const noAppeal = pipe.noAppealChosen === true || hubRow.noAppealChosen === true;
    const appealFinal = pipe.appealStatus === 'final' || hubRow.appealStatus === 'final';
    const grievanceAccepted =
        pipe.appealResult === 'قبول التظلم' || hubRow.appealResult === 'قبول التظلم';
    if (noAppeal && appealFinal && grievanceAccepted) return true;
    if (
        noAppeal &&
        appealFinal &&
        (hubRow.executorOutcome === 'rejected' || pipe.executorOutcome === 'rejected')
    ) {
        return true;
    }

    const logs = [
        ...(Array.isArray(hubRow.appealTimelineLogs) ? hubRow.appealTimelineLogs : []),
        ...(Array.isArray(pipe.appealTimelineLogs) ? pipe.appealTimelineLogs : []),
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
        appealFinal &&
        isCreditorInitiatedExecutorRequest(hubRow)
    ) {
        const state = resolveCreditorDecisionEnforcementState(hubRow, pipe, {
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
    return isExecutorRequestAppealCycleSuperseded(row as Decision, all as Decision[], perspective);
}

export function isExecutorRequestFollowupBlockedFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): boolean {
    if (!row || typeof row !== 'object') return false;
    return isExecutorRequestFollowupBlocked(row as Decision, all as Decision[], perspective);
}

export function resolveExecutorRequestFollowupBlockFromRecord(
    row: Record<string, unknown> | null | undefined,
    all: Record<string, unknown>[],
    perspective: AppealUiPerspective = 'creditor_agent'
): ExecutorRequestFollowupBlock | null {
    if (!row || typeof row !== 'object') return null;
    return resolveExecutorRequestFollowupBlock(row as Decision, all as Decision[], perspective);
}
