import type { StageConclusion } from './criminalStore';

/** غلق مؤقت — يبقى القرار مسجّلاً لكن يُسمح بقرار ختامي لاحق */
export function isTemporaryClosingFollowUp(finalDecision?: StageConclusion): boolean {
    return finalDecision?.decisionType === 'temporary_closing';
}

export function resolveCanConcludeStage(input: {
    isDefaultJudgmentArchived: boolean;
    isArchived: boolean;
    isPrejudicialFrozen: boolean;
    finalDecision?: StageConclusion;
    isInvestigationPhase: boolean;
    hasTrialStageType: boolean;
}): boolean {
    const {
        isDefaultJudgmentArchived,
        isArchived,
        isPrejudicialFrozen,
        finalDecision,
        isInvestigationPhase,
        hasTrialStageType,
    } = input;

    if (isDefaultJudgmentArchived && isArchived) return true;
    if (isPrejudicialFrozen) return false;
    if (finalDecision && !isTemporaryClosingFollowUp(finalDecision)) return false;
    return isInvestigationPhase || hasTrialStageType;
}

export function shouldOpenInvestigationDecisionModal(input: {
    isInvestigationPhase: boolean;
    finalDecision?: StageConclusion;
}): boolean {
    return (
        input.isInvestigationPhase &&
        (!input.finalDecision || isTemporaryClosingFollowUp(input.finalDecision))
    );
}

/**
 * هل يُسمح بتسجيل قرار قضائي أو طلب محامٍ جديد من شريط التبويبات؟
 * قيود التحقيق (مختومة / مقفلة / مجمدة) لا تُطبَّق خارج مرحلة التحقيق.
 */
export function resolveCanCreateDecisionsOrRequests(input: {
    isDashboardReadOnly: boolean;
    isCassationFilterReadOnly: boolean;
    isHistoricalNodeView: boolean;
    isInterventionReview: boolean;
    isInvestigationPhase: boolean;
    isInvestigationDossierSealed: boolean;
    isInvestigationLocked: boolean;
    isPrejudicialFrozen: boolean;
}): boolean {
    if (input.isDashboardReadOnly) return false;
    if (input.isCassationFilterReadOnly) return false;
    if (input.isHistoricalNodeView) return false;
    if (input.isInterventionReview) return false;
    if (!input.isInvestigationPhase) return true;
    if (input.isInvestigationDossierSealed) return false;
    if (input.isInvestigationLocked) return false;
    if (input.isPrejudicialFrozen) return false;
    return true;
}
