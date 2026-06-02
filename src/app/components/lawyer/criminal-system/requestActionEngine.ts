import type { CaseStage, DecisionAppealabilityCategory, JudicialDecision } from '@/app/types/criminal';
import { isPriorStageRecordAppealsSealed } from './stageTransitionAppealEngine';
import { normalizeDashboardCassationStage } from './stageCassationActionGates';

/** أمر قاضٍ صادر على طلب محامٍ (موافقة أو رفض) — يُعامل كقرار في السجل. */
export function isLawyerRequestJudgeOrder(decision: JudicialDecision): boolean {
    return Boolean(
        String(decision.sourceRequestId ?? '').trim() &&
            (decision.requestOutcomeStatus === 'approved' || decision.requestOutcomeStatus === 'rejected'),
    );
}

/**
 * @deprecated استخدم isPriorStageRecordAppealsSealed — يُبقى للتوافق مع الاختبارات القديمة.
 */
export function isPriorStageLawyerRequestOrderSealed(
    decision: JudicialDecision,
    currentCaseStage?: CaseStage,
    decisionRecordStage?: CaseStage,
): boolean {
    return isPriorStageRecordAppealsSealed(decision, currentCaseStage, decisionRecordStage);
}

export function resolveInitialLawyerOrderAppealability(caseStage?: CaseStage): DecisionAppealabilityCategory {
    if (caseStage === 'investigation') return 'قابل للطعن على انفراد';
    if (caseStage === 'misdemeanor' || caseStage === 'felony') return 'غير قابل للطعن على انفراد';
    return 'غير قابل للطعن على انفراد';
}

/** هل يترتب على القرار منع أو وقف في سير الدعوى؟ (نعم = قابل للطعن على انفراد) */
export function resolveProceedingsBlockToggleValue(decision: JudicialDecision): boolean {
    return decision.decisionAppealability === 'قابل للطعن على انفراد';
}

export function shouldShowProceedingsBlockToggle(
    decision: JudicialDecision,
    caseStage?: CaseStage,
    decisionRecordStage?: CaseStage,
): boolean {
    if (isPriorStageRecordAppealsSealed(decision, caseStage, decisionRecordStage)) return false;
    if (!isLawyerRequestJudgeOrder(decision)) return false;
    const dashboard = normalizeDashboardCassationStage(caseStage);
    return dashboard === 'misdemeanor' || dashboard === 'felony';
}

/** هل تُعرض أزرار الطعن على أمر طلب المحامي؟ */
export function shouldShowRequestOrderAppealActions(
    decision: JudicialDecision,
    caseStage?: CaseStage,
    decisionRecordStage?: CaseStage,
): boolean {
    if (isPriorStageRecordAppealsSealed(decision, caseStage, decisionRecordStage)) return false;
    if (!isLawyerRequestJudgeOrder(decision)) return true;
    const dashboard = normalizeDashboardCassationStage(caseStage);
    if (dashboard === 'investigation') return true;
    if (dashboard === 'misdemeanor' || dashboard === 'felony') {
        return decision.decisionAppealability === 'قابل للطعن على انفراد';
    }
    return false;
}

/** قرار فعّال لحساب الشارات والأزرار — يطبّق قواعد مرحلة التحقيق/الجنح/الجنايات. */
export function resolveEffectiveRequestOrderDecision(
    decision: JudicialDecision,
    caseStage?: CaseStage,
    decisionRecordStage?: CaseStage,
): JudicialDecision {
    if (!isLawyerRequestJudgeOrder(decision)) return decision;
    if (isPriorStageRecordAppealsSealed(decision, caseStage, decisionRecordStage)) {
        return { ...decision, decisionAppealability: 'غير قابل للطعن على انفراد' };
    }
    const dashboard = normalizeDashboardCassationStage(caseStage);
    if (dashboard === 'investigation') {
        return { ...decision, decisionAppealability: 'قابل للطعن على انفراد' };
    }
    if (dashboard === 'misdemeanor' || dashboard === 'felony') {
        return {
            ...decision,
            decisionAppealability:
                decision.decisionAppealability ?? resolveInitialLawyerOrderAppealability(caseStage),
        };
    }
    return decision;
}

export function resolveProceedingsBlockAppealability(blocksProceedings: boolean): DecisionAppealabilityCategory {
    return blocksProceedings ? 'قابل للطعن على انفراد' : 'غير قابل للطعن على انفراد';
}
