import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import {
    decisionHasActiveAppealOfPath,
    getPendingCassationAppealForResult,
} from './judicialDecisionsEngine';
import { isPriorStageRecordAppealsSealed } from './stageTransitionAppealEngine';
import {
    applyStageCassationActionGates,
    normalizeDashboardCassationStage,
} from './stageCassationActionGates';
import { computeOrdinaryCassationWindow } from './decisionAppealPeriodCalendar';
import { canShowCassationCorrectionForJudicialDecision } from './decisionAppealPeriodCorrection';
import {
    resolveDecisionAppealLifecycle,
    resolveDecisionAppealStatePhase,
} from './decisionAppealPeriodLifecycle';
import type {
    CassationCorrectionUserRole,
    DecisionAppealActionKind,
    DecisionAppealBadgeView,
} from './decisionAppealPeriodTypes';

function shouldOfferJudicialCassationCorrection(
    decision: JudicialDecision,
    context?: {
        userRole?: CassationCorrectionUserRole;
        referenceDate?: Date;
    },
): boolean {
    if (decisionHasActiveAppealOfPath(decision, 'correction_266')) return false;
    return canShowCassationCorrectionForJudicialDecision(decision, {
        userRole: context?.userRole,
        referenceDate: context?.referenceDate,
        correctionAlreadyPending: decision.cassationCorrectionPending === true,
    });
}

export function resolveDecisionAppealBadge(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage; crimeTypeLabel?: string; referenceDate?: Date },
): DecisionAppealBadgeView {
    const life = resolveDecisionAppealLifecycle(decision, context);
    const phase = resolveDecisionAppealStatePhase(decision, context);
    const cassationWindow = computeOrdinaryCassationWindow(life.issuedDate, context?.referenceDate);

    if (phase === 'manual_final') {
        return { label: 'حكم بات — إعلان يدوي', tone: 'manual_final' };
    }

    if (phase === 'under_cassation_review') {
        return { label: 'قيد التدقيق التمييزي', tone: 'review' };
    }

    if (phase === 'quashed_final') {
        return { label: 'قرار منقوض - يعاد للمحكمة', tone: 'quashed' };
    }

    if (phase === 'upheld_absolute_final') {
        return { label: 'حكم بات نافذ قطعي', tone: 'absolute_finality' };
    }

    if (phase === 'upheld_correction_window') {
        return { label: '', tone: 'result' };
    }

    if (life.decisionAppealability === 'غير قابل للطعن على انفراد') {
        return { label: 'قرار إعدادي نافذ', tone: 'preparatory_final' };
    }

    if (cassationWindow.isExpired) {
        return { label: 'انقضاء مدة الطعن العادي', tone: 'period_expired' };
    }

    return {
        label: `متبقي ${cassationWindow.remainingDays} يوم للتمييز`,
        tone: 'countdown',
    };
}

function finalizeDecisionAppealActions(
    actions: DecisionAppealActionKind[],
    decision: JudicialDecision,
    context?: {
        caseStage?: CaseStage;
        userRole?: CassationCorrectionUserRole;
    },
): DecisionAppealActionKind[] {
    const pending = getPendingCassationAppealForResult(decision);
    const next =
        pending && !actions.includes('record_appeal_result')
            ? [...actions, 'record_appeal_result']
            : actions;
    return applyStageCassationActionGates(next, decision, context);
}

export function resolveDecisionAppealActions(
    decision: JudicialDecision,
    context?: {
        caseStage?: CaseStage;
        decisionRecordStage?: CaseStage;
        crimeTypeLabel?: string;
        readOnly?: boolean;
        referenceDate?: Date;
        userRole?: CassationCorrectionUserRole;
    },
): DecisionAppealActionKind[] {
    if (context?.readOnly) return [];
    if (
        context?.decisionRecordStage &&
        isPriorStageRecordAppealsSealed(decision, context.caseStage, context.decisionRecordStage)
    ) {
        return [];
    }

    const life = resolveDecisionAppealLifecycle(decision, context);
    const phase = resolveDecisionAppealStatePhase(decision, context);
    const cassationWindow = computeOrdinaryCassationWindow(life.issuedDate, context?.referenceDate);
    const actions: DecisionAppealActionKind[] = [];

    if (phase === 'manual_final' || phase === 'quashed_final' || phase === 'upheld_absolute_final') {
        return actions;
    }

    if (phase === 'under_cassation_review') {
        const pending = getPendingCassationAppealForResult(decision);
        if (pending) actions.push('record_appeal_result');
        return finalizeDecisionAppealActions(actions, decision, {
            caseStage: context?.caseStage,
            userRole: context?.userRole,
        });
    }

    if (phase === 'upheld_correction_window') {
        if (shouldOfferJudicialCassationCorrection(decision, context)) {
            actions.push('cassation_correction');
        }
        const dashboard = normalizeDashboardCassationStage(context?.caseStage);
        const correctionPending =
            decision.cassationCorrectionPending === true ||
            decisionHasActiveAppealOfPath(decision, 'correction_266');
        if (
            (dashboard === 'investigation' || dashboard === 'misdemeanor') &&
            !correctionPending &&
            !decisionHasActiveAppealOfPath(decision, 'intervention_264b')
        ) {
            actions.push('intervention_cassation');
        }
        if (!life.isJudgmentFinalDeclared) {
            actions.push('declare_judgment_final');
        }
        return finalizeDecisionAppealActions(actions, decision, {
            caseStage: context?.caseStage,
            userRole: context?.userRole,
        });
    }

    if (phase === 'not_appealed') {
        if (life.decisionAppealability === 'غير قابل للطعن على انفراد') {
            if (!decisionHasActiveAppealOfPath(decision, 'intervention_264b')) {
                actions.push('intervention_cassation');
            }
        } else if (life.decisionAppealability === 'قابل للطعن على انفراد') {
            const dashboard = normalizeDashboardCassationStage(context?.caseStage);
            const dualInterventionStage = dashboard === 'investigation' || dashboard === 'misdemeanor';
            const canOfferIntervention = !decisionHasActiveAppealOfPath(decision, 'intervention_264b');

            if (!cassationWindow.isExpired) {
                actions.push('cassation_appeal');
            }
            if (
                canOfferIntervention &&
                (dualInterventionStage || (cassationWindow.isExpired && dashboard !== 'felony'))
            ) {
                actions.push('intervention_cassation');
            }
        } else if (life.decisionAppealability === 'قرار تمييزي') {
            if (shouldOfferJudicialCassationCorrection(decision, context)) {
                actions.push('cassation_correction');
            }
        }

        if (!life.isJudgmentFinalDeclared) {
            actions.push('declare_judgment_final');
        }
    }

    return finalizeDecisionAppealActions(actions, decision, {
        caseStage: context?.caseStage,
        userRole: context?.userRole,
    });
}

/** هل يُعرض زر «تسجيل طعن تمييزي» العادي على البطاقة؟ */
export function shouldShowCassationAppealFileAction(
    decision: JudicialDecision,
    context?: {
        caseStage?: CaseStage;
        decisionRecordStage?: CaseStage;
        crimeTypeLabel?: string;
        readOnly?: boolean;
        userRole?: CassationCorrectionUserRole;
    },
): boolean {
    return resolveDecisionAppealActions(decision, context).includes('cassation_appeal');
}
