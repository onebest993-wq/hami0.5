import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import { getPendingCassationAppealForResult } from './judicialDecisionsEngine';
import { remainingDaysFromIsoAnchor } from './decisionAppealPeriodCalendar';
import {
    inferDecisionAppealability,
    inferDecisionCaseType,
    inferDecisionPresenceType,
} from './decisionAppealPeriodInference';
import {
    formatAppealResultLabel,
    resolveAppealResultCategory,
    resolveAppealResultRecordedAt,
    resolveStoredAppealResultRaw,
} from './decisionAppealPeriodResults';
import {
    CASSATION_CORRECTION_WINDOW_DAYS,
    type DecisionAppealLifecycleFields,
    type DecisionAppealStatePhase,
} from './decisionAppealPeriodTypes';

export function resolveDecisionAppealLifecycle(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): DecisionAppealLifecycleFields {
    const issuedDate = String(decision.issuedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const decisionPresenceType = inferDecisionPresenceType(decision, context?.caseStage);
    const decisionCaseType =
        decision.decisionCaseType === 'جناية' ||
        decision.decisionCaseType === 'جنحة' ||
        decision.decisionCaseType === 'مخالفة'
            ? decision.decisionCaseType
            : inferDecisionCaseType(context?.caseStage, context?.crimeTypeLabel);
    const decisionAppealability = inferDecisionAppealability(decision, context);

    const pending = getPendingCassationAppealForResult(decision);
    const hasFiledAppeal = (Array.isArray(decision.appeals) ? decision.appeals : []).some(
        (a) => String(a.filedAt ?? '').trim().length > 0,
    );
    const isAppealed =
        decision.isAppealed === true ||
        decision.interventionCassationPending === true ||
        hasFiledAppeal ||
        Boolean(pending);

    const appealResultRaw = resolveStoredAppealResultRaw(decision);
    const appealResult = appealResultRaw ? formatAppealResultLabel(appealResultRaw) : '';

    return {
        decisionPresenceType,
        decisionCaseType,
        decisionAppealability,
        issuedDate,
        isAppealed,
        appealResult,
        isJudgmentFinalDeclared: decision.isJudgmentFinalDeclared === true,
        cassationPapersReceivedAt: decision.cassationPapersReceivedAt,
    };
}

export function resolveDecisionAppealStatePhase(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string; referenceDate?: Date },
): DecisionAppealStatePhase {
    const life = resolveDecisionAppealLifecycle(decision, context);

    if (life.isJudgmentFinalDeclared) return 'manual_final';

    const resultRaw = resolveStoredAppealResultRaw(decision);
    const resultCategory = resolveAppealResultCategory(resultRaw);

    if (resultCategory === 'quashed') return 'quashed_final';

    if (resultCategory === 'upheld') {
        const recordedAt = resolveAppealResultRecordedAt(decision) || life.issuedDate;
        const correctionRemaining = remainingDaysFromIsoAnchor(
            recordedAt,
            CASSATION_CORRECTION_WINDOW_DAYS,
            context?.referenceDate,
        );
        return correctionRemaining > 0 ? 'upheld_correction_window' : 'upheld_absolute_final';
    }

    if (life.isAppealed) return 'under_cassation_review';

    return 'not_appealed';
}

export function resolveCassationCorrectionRemainingDays(
    decision: JudicialDecision,
    referenceDate = new Date(),
): number {
    const recordedAt = resolveAppealResultRecordedAt(decision);
    if (!recordedAt) return 0;
    return remainingDaysFromIsoAnchor(recordedAt, CASSATION_CORRECTION_WINDOW_DAYS, referenceDate);
}

export function enrichJudicialDecisionAppealFields(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): JudicialDecision {
    const life = resolveDecisionAppealLifecycle(decision, context);
    return {
        ...decision,
        decisionPresenceType: life.decisionPresenceType,
        decisionCaseType: life.decisionCaseType,
        decisionAppealability: life.decisionAppealability,
        issuedAt: life.issuedDate,
        isAppealed: life.isAppealed,
        appealResult: life.appealResult || undefined,
        isJudgmentFinalDeclared: life.isJudgmentFinalDeclared || undefined,
        cassationPapersReceivedAt: life.cassationPapersReceivedAt,
    };
}

export function buildDefaultAppealFieldsForNewDecision(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string },
): Partial<JudicialDecision> {
    const life = resolveDecisionAppealLifecycle(decision, context);
    return {
        decisionPresenceType: life.decisionPresenceType,
        decisionCaseType: life.decisionCaseType,
        decisionAppealability: life.decisionAppealability,
        isAppealed: false,
        appealResult: undefined,
        isJudgmentFinalDeclared: false,
    };
}
