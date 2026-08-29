import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase } from './criminalStore';
import { isInvestigationStoredStage } from './criminalStageUtils';
import {
    BAIL_RELEASE_TEMPLATE,
    isDetentionRequestTemplate,
    isOrderEnforcementTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';

export type CriminalCaseUserRole = 'complainant_lawyer' | 'defendant_lawyer' | '';

export type CassationAppealAudienceContext = {
    userRole: CriminalCaseUserRole;
};

const BAIL_TEMPLATE = BAIL_RELEASE_TEMPLATE;

export function resolveCriminalCaseUserRole(
    caseRecord: Pick<CriminalCase, 'basics'> | { basics?: CriminalCase['basics'] & { userRole?: string } },
): CriminalCaseUserRole {
    const explicit = String((caseRecord.basics as { userRole?: string } | undefined)?.userRole ?? '').trim();
    if (explicit === 'complainant_lawyer' || explicit === 'defendant_lawyer') {
        return explicit;
    }
    const rep = String(caseRecord.basics?.ourRepresentation ?? '').trim();
    const stage = String(caseRecord.basics?.stage ?? '').trim();
    const roleLabel = String(caseRecord.basics?.role ?? '').trim();
    const normalizedRep =
        rep === 'defendant_side' || rep === 'defendant'
            ? 'defendant_side'
            : rep === 'complainant_side' || rep === 'complainant' || rep === 'civil_claimant'
              ? 'complainant_side'
              : roleLabel === 'وكيل المشكو منه'
                ? 'defendant_side'
                : 'complainant_side';
    if (normalizedRep === 'defendant_side') return 'defendant_lawyer';
    if (normalizedRep === 'complainant_side' && (isInvestigationStoredStage(stage) || !stage)) {
        return 'complainant_lawyer';
    }
    if (normalizedRep === 'complainant_side') return 'complainant_lawyer';
    return '';
}

export function isComplainantLawyerRole(userRole: CriminalCaseUserRole | undefined): boolean {
    return userRole === 'complainant_lawyer';
}

function decisionProceduralTemplateKey(decision: JudicialDecision): string {
    return normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
}

function isArrestSummonProceduralTemplate(key: string): boolean {
    if (isOrderEnforcementTemplate(key)) return true;
    return /استقدام|قبض|تحري/.test(key) && !/كفالة|إخلاء/.test(key);
}

function isDetentionProceduralTemplate(key: string): boolean {
    return isDetentionRequestTemplate(key) || (/توقيف/.test(key) && !/إخلاء|كفالة/.test(key));
}

function isBailProceduralTemplate(key: string): boolean {
    return key === BAIL_TEMPLATE || (/كفالة|إخلاء سبيل/.test(key) && !/توقيف/.test(key));
}

/** قرار حاسم (م 130) بإلغاء التهمة / إفراج / غلق — يجيز طعن المشتكي. */
function isArticle130InvestigationDismissalDecision(decision: JudicialDecision): boolean {
    if (decision.decisionType !== 'dispositive') return false;
    const title = normalizeProceduralRequestTemplate(decision.title);
    const text = `${title} ${decision.summary} ${decision.proceduralTemplate ?? ''}`;
    if (
        title === 'قرار غلق الدعوى (مادة 130 أصول)' ||
        title === 'قرار غلق الدعوى' ||
        title.includes('غلق الدعوى')
    ) {
        return true;
    }
    const has130 = /مادة\s*130|130\s*أصول/i.test(text);
    const hasDismissEffect =
        /إلغاء\s*التهمة|إلغاء\s*التهم|براءة|غلق\s*الدعوى|انقضاء|سقوط\s*الدعوى|إفراج/i.test(text);
    if (!has130 || !hasDismissEffect) return false;
    if (/إحالة\s*إلى\s*محكمة|إحالة.*الموضوع/i.test(text) && !hasDismissEffect) return false;
    return true;
}

/** قرار يصب في مصلحة المشتكي — يُحظر الطعن من قبله. */
export function isComplainantFavorableProceduralOutcome(decision: JudicialDecision): boolean {
    const key = decisionProceduralTemplateKey(decision);
    const status = decision.requestOutcomeStatus;
    if (!status) return false;
    if (isBailProceduralTemplate(key) && status === 'rejected') return true;
    if (isDetentionProceduralTemplate(key)) {
        if (status === 'approved') return true;
        if (!status && decision.isLocked) return true;
    }
    return false;
}

/** الحالات المحددة التي يتضرر فيها المشتكي — يجوز إظهار زر الطعن. */
function isComplainantHarmCassationTrigger(decision: JudicialDecision): boolean {
    const key = decisionProceduralTemplateKey(decision);
    const status = decision.requestOutcomeStatus;
    if (isArticle130InvestigationDismissalDecision(decision)) return true;
    if (!status) return false;
    if (isBailProceduralTemplate(key) && status === 'approved') return true;
    if (isArrestSummonProceduralTemplate(key) && status === 'rejected') return true;
    if (isDetentionProceduralTemplate(key) && status === 'rejected') return true;
    return false;
}

export function canComplainantLawyerFileCassationAppeal(decision: JudicialDecision): boolean {
    if (isComplainantFavorableProceduralOutcome(decision)) return false;
    return isComplainantHarmCassationTrigger(decision);
}

