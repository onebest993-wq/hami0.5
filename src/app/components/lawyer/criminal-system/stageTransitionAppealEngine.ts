import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import { INVESTIGATION_REFERRAL_JUVENILE_LABEL } from './juvenileInvestigationRules';
import {
    COMPLAINT_COURT_REFERRAL_TEMPLATE,
    isCustomJudicialTemplate,
    JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { isInvestigationReferralCategory } from './criminalStageUtils';
import { normalizeDashboardCassationStage, type DashboardCassationStage } from './stageCassationActionGates';

const STAGE_ORDER: Record<Exclude<DashboardCassationStage, 'other'>, number> = {
    investigation: 0,
    misdemeanor: 1,
    felony: 2,
};

/** قرار انتقال مرحلي (إحالة/عدم اختصاص) — يبقى قابلاً للطعن في المرحلة التالية. */
export function isProceduralStageTransitionDecision(decision: JudicialDecision): boolean {
    const sourceId = String(decision.sourceRequestId ?? '').trim();
    if (sourceId.startsWith('route_')) return true;

    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (template === JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE) return false;

    const title = String(decision.title ?? '').trim();
    const summary = String(decision.summary ?? '').trim();
    const blob = `${title} ${summary} ${template}`.trim();

    if (isInvestigationReferralCategory(title) || title === INVESTIGATION_REFERRAL_JUVENILE_LABEL) {
        return true;
    }

    if (String(decision.referredCourtName ?? '').trim()) {
        if (
            template === COMPLAINT_COURT_REFERRAL_TEMPLATE ||
            /إحالة/i.test(blob)
        ) {
            return true;
        }
    }

    if (
        /قرار إحالة/i.test(blob) ||
        /إحالة إلى/i.test(blob) ||
        /إحالة.*(محكمة|موضوع|جنايات|جنح|أحداث)/i.test(blob) ||
        /عدم اختصاص.*إحالة/i.test(blob) ||
        /إعادة.*(لل|إلى).*التحقيق/i.test(blob)
    ) {
        return true;
    }

    if (
        decision.isAppealable === true &&
        isCustomJudicialTemplate(template) &&
        /إحالة|عدم اختصاص/i.test(blob)
    ) {
        return true;
    }

    return false;
}

export function isPriorStageRelativeToCurrent(
    decisionRecordStage?: CaseStage,
    currentCaseStage?: CaseStage,
): boolean {
    const record = normalizeDashboardCassationStage(decisionRecordStage);
    const current = normalizeDashboardCassationStage(currentCaseStage);
    if (record === 'other' || current === 'other') return false;
    if (record === current) return false;
    return STAGE_ORDER[record] < STAGE_ORDER[current];
}

/**
 * يُقفل الطعن على قرارات/طلبات المرحلة السابقة بعد الانتقال —
 * باستثناء قرار الانتقال (الإحالة) الذي يُعرض في قسم قرارات المرحلة التالية.
 */
export function isPriorStageRecordAppealsSealed(
    decision: JudicialDecision,
    currentCaseStage?: CaseStage,
    decisionRecordStage?: CaseStage,
): boolean {
    if (!decisionRecordStage || !currentCaseStage) return false;
    if (!isPriorStageRelativeToCurrent(decisionRecordStage, currentCaseStage)) return false;
    if (isProceduralStageTransitionDecision(decision)) return false;
    return true;
}
