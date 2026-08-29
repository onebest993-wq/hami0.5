import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import { isDecisionCassationAppealable } from './proceduralRequestTypes';
import type {
    DecisionAppealabilityCategory,
    DecisionCaseType,
    DecisionPresenceType,
} from './decisionAppealPeriodTypes';

export function inferDecisionCaseType(
    caseStage?: CaseStage,
    crimeTypeLabel?: string,
): DecisionCaseType {
    const text = String(crimeTypeLabel ?? '').trim();
    if (/مخالف/i.test(text)) return 'مخالفة';
    if (caseStage === 'felony' || /جناي/i.test(text)) return 'جناية';
    if (caseStage === 'misdemeanor' || /جنح/i.test(text)) return 'جنحة';
    return 'جنحة';
}

export function inferDecisionPresenceType(
    decision: JudicialDecision,
    caseStage?: CaseStage,
): DecisionPresenceType {
    if (decision.decisionPresenceType === 'وجاهي' || decision.decisionPresenceType === 'غيابي') {
        return decision.decisionPresenceType;
    }
    if (caseStage === 'absentia_trial') return 'غيابي';
    const text = `${decision.title} ${decision.summary}`;
    if (/غياب/i.test(text)) return 'غيابي';
    return 'وجاهي';
}

export function inferDecisionAppealability(
    decision: JudicialDecision,
    context?: { caseStage?: CaseStage },
): DecisionAppealabilityCategory {
    if (
        decision.decisionAppealability === 'قابل للطعن على انفراد' ||
        decision.decisionAppealability === 'غير قابل للطعن على انفراد' ||
        decision.decisionAppealability === 'قرار تمييزي'
    ) {
        return decision.decisionAppealability;
    }

    const sourceRequestId = String(decision.sourceRequestId ?? '').trim();
    const isLawyerOrder =
        Boolean(sourceRequestId) &&
        (decision.requestOutcomeStatus === 'approved' || decision.requestOutcomeStatus === 'rejected');
    if (isLawyerOrder) {
        if (context?.caseStage === 'investigation') return 'قابل للطعن على انفراد';
        if (context?.caseStage === 'misdemeanor' || context?.caseStage === 'felony') {
            return 'غير قابل للطعن على انفراد';
        }
    }

    const text = `${decision.title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (/تمييز|هيئة التمييز|التمييز/i.test(text)) return 'قرار تمييزي';
    if (context?.caseStage === 'cassation' && decision.decisionType === 'dispositive') {
        return 'قرار تمييزي';
    }
    if (decision.decisionType === 'dispositive') return 'قابل للطعن على انفراد';
    if (decision.isAppealable === true) return 'قابل للطعن على انفراد';
    if (!isDecisionCassationAppealable(decision)) {
        return 'غير قابل للطعن على انفراد';
    }
    return 'قابل للطعن على انفراد';
}
