import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase, CriminalComplainant, CriminalDefendant, CriminalCaseStage } from './criminalStore';
import type { StageConclusion } from './criminalStore';
import { inferJudicialDecisionKind, inferJudicialDisposition } from './judicialDecisionsEngine';
import {
    anonymizeJuvenilePartyName,
    displayPartyNameForCase,
    hasJuvenileAccused,
    hasJuvenileParty,
    isInvestigationStoredStage,
} from './criminalStageUtils';
import { isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import {
    CUSTOM_JUDICIAL_DECISION_TYPE,
    DETENTION_DECISION_TEMPLATE,
    INVESTIGATION_PURGE_JUDICIAL_TEMPLATES,
    ASSET_SEIZURE_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    isCustomJudicialTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isInvestigationSharedOrderTemplate,
    isInvestigationExpirationJudicialTemplate,
    isInvestigationPurgeDecisionTemplate,
    isAssetSeizureTemplate,
    isJuvenileExclusiveInvestigationPurgeTemplate,
    isJuvenileJudgeCassationAppealableTemplate,
    isJuvenileJudgeDecisionTemplate,
    isJudicialDecisionTemplate,
    isOrderEnforcementTemplate,
    formatJudicialTemplateDisplayLabel,
    JUVENILE_JUDGE_DECISION_TEMPLATES,
    JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
    judicialDecisionModalTemplates,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';

export function isInvestigationAdultDefendantTargetTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (
        isOrderEnforcementTemplate(key) ||
        key === DETENTION_DECISION_TEMPLATE ||
        key === DEFENDANT_BAIL_TEMPLATE ||
        key === ASSET_SEIZURE_TEMPLATE
    );
}

export {
    isJuvenileExclusiveInvestigationPurgeTemplate,
    isJuvenileJudgeDecisionTemplate,
    isJuvenileJudgeCassationAppealableTemplate,
    JUVENILE_JUDGE_DECISION_TEMPLATES,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
};

/** اسم محكمة التحقيق المقترح عند إنشاء إضبارة حدث. */
export const JUVENILE_INVESTIGATION_COURT_NAME = 'محكمة تحقيق الأحداث';

/** محكمة الموضوع للأحداث — إحالة ختام التحقيق. */
export const JUVENILE_TRIAL_COURT_NAME = 'محكمة الأحداث';

export const INVESTIGATION_REFERRAL_JUVENILE_LABEL = 'إحالة إلى محكمة الأحداث';

/** قرار إلزامي في مرحلة التحقيق عند وجود متهم حدث. */
export const SOCIAL_INQUIRY_REFERRAL_TEMPLATE = JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE;

/** مرجع قانوني موحّد لتقرير الباحث الاجتماعي في واجهات الأحداث. */
export const JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF = '(المادة 62 من قانون رعاية الأحداث)';

/** مكان الإيداع الوحيد المسموح للحدث أثناء التحقيق. */
export const JUVENILE_INVESTIGATION_DETENTION_AUTHORITY = 'دار الملاحظة';

export type InvestigationReferralTargetStage = 'misdemeanor' | 'felony' | 'juvenile';

export function investigationJuvenileDetentionAuthorityLabel(): string {
    return JUVENILE_INVESTIGATION_DETENTION_AUTHORITY;
}

export function isInvestigationJuvenileCategoryDefendant(
    d: Pick<CriminalDefendant, 'isJuvenile' | 'isUnderSeven'>,
): boolean {
    return Boolean(d.isJuvenile) || Boolean(d.isUnderSeven);
}

export function isInvestigationAdultCategoryDefendant(
    d: Pick<CriminalDefendant, 'isJuvenile' | 'isUnderSeven'>,
): boolean {
    return !isInvestigationJuvenileCategoryDefendant(d);
}

export type InvestigationDefendantsPartyMix = 'adults_only' | 'juveniles_only' | 'mixed';

export function resolveInvestigationDefendantsPartyMix(
    defendants: ReadonlyArray<Pick<CriminalDefendant, 'id' | 'isJuvenile' | 'isUnderSeven'>>,
): InvestigationDefendantsPartyMix {
    const identified = defendants.filter(
        (d) => !isDefendantIdentityUnknown(d as CriminalDefendant),
    );
    const withJuvenile = identified.some((d) => isInvestigationJuvenileCategoryDefendant(d));
    const withAdult = identified.some((d) => isInvestigationAdultCategoryDefendant(d));
    if (withJuvenile && withAdult) return 'mixed';
    if (withJuvenile) return 'juveniles_only';
    return 'adults_only';
}

export function partyIdsIncludeJuvenile(
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile' | 'isUnderSeven'>>,
    partyIds: string[],
): boolean {
    const set = new Set(partyIds.map((x) => String(x ?? '').trim()).filter(Boolean));
    if (!set.size) return false;
    return defendants.some((d) => set.has(d.id) && isInvestigationJuvenileCategoryDefendant(d));
}

export function selectedInvestigationDefendantsAllJuvenile(
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile' | 'isUnderSeven'>>,
    selectedIds: string[],
): boolean {
    const ids = selectedIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!ids.length) return false;
    return ids.every((id) => {
        const hit = defendants.find((d) => d.id === id);
        return hit ? isInvestigationJuvenileCategoryDefendant(hit) : false;
    });
}

export function selectedInvestigationDefendantsIncludeJuvenile(
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile'>>,
    selectedIds: string[],
): boolean {
    return partyIdsIncludeJuvenile(defendants, selectedIds);
}

export { anonymizeJuvenilePartyName, displayPartyNameForCase };

/** تسمية الحالة في لوحة التحكم بعد توقيف الحدث. */
export function formatJuvenileInvestigationDetentionDashboardStatus(
    status: string,
    options: { isJuvenile?: boolean; detentionAuthority?: string },
): string | null {
    if (!options.isJuvenile) return null;
    const s = String(status ?? '').trim();
    const auth = String(options.detentionAuthority ?? '').trim();
    const inObservation =
        s === 'juvenile_detention' ||
        s === 'موقوف' ||
        s === 'ملقى القبض عليه' ||
        /دار\s*الملاحظة|دار\s*ملاحظة/i.test(auth);
    if (!inObservation) return null;
    return 'موقوف (دار الملاحظة)';
}

export function syncJuvenileInvestigationCaseFlags(caseRecord: CriminalCase): CriminalCase {
    const hasJuvenile = hasJuvenileParty(
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
        Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [],
    );
    if (!hasJuvenile) return caseRecord;

    const defendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
        if (!Boolean((d as CriminalDefendant).isJuvenile)) return d;
        const existing = (d as CriminalDefendant).socialInquiryReport;
        return {
            ...d,
            socialInquiryReport: existing ?? {
                isAttached: false,
                workflowStatus: 'not_requested' as const,
                receivedDate: '',
                investigatorName: '',
                recommendations: '',
            },
        };
    });

    const storedStage = String(caseRecord.basics?.stage ?? '').trim();
    const location = { ...caseRecord.location };
    if (
        isInvestigationStoredStage(storedStage) &&
        !String(location.investigationCourtName ?? '').trim() &&
        (storedStage === 'تحقيق الأحداث' ||
            resolveInvestigationDefendantsPartyMix(
                Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
            ) === 'juveniles_only')
    ) {
        location.investigationCourtName = JUVENILE_INVESTIGATION_COURT_NAME;
    }

    return {
        ...caseRecord,
        isConfidential: true,
        defendants,
        location,
    };
}

export function applyJuvenileSocialInquiryReferralOnDefendants(
    defendants: CriminalDefendant[],
    defendantIds: string[],
): CriminalDefendant[] {
    const idSet = new Set(defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean));
    if (!idSet.size) return defendants;
    return defendants.map((d) => {
        if (!idSet.has(d.id) || !d.isJuvenile) return d;
        const base = d.socialInquiryReport ?? {
            isAttached: false,
            workflowStatus: 'not_requested' as const,
            receivedDate: '',
            investigatorName: '',
            recommendations: '',
        };
        if (base.workflowStatus === 'submitted') return d;
        return {
            ...d,
            socialInquiryReport: {
                ...base,
                workflowStatus: 'under_preparation',
                isAttached: false,
            },
        };
    });
}

export function resolveInvestigationReferralStageLabel(target: InvestigationReferralTargetStage): string {
    if (target === 'felony') return 'محكمة الجنايات';
    if (target === 'juvenile') return JUVENILE_TRIAL_COURT_NAME;
    return 'محكمة الجنح';
}

/** قيمة `basics.stage` بعد إحالة التحقيق — تُستخدم بدل `storedStageFromCaseStage` للأحداث. */
export function storedStageFromInvestigationReferralTarget(
    target: InvestigationReferralTargetStage,
): CriminalCaseStage {
    return resolveInvestigationReferralStageLabel(target) as CriminalCaseStage;
}

type DefendantStatusAtDecision = StageConclusion['defendantStatusAtDecision'];

/**
 * بطاقة قرار إحالة الحدث — تبقى في إضبارة التحقيق (قابلة للتمييز) ولا تُطبَّق على إضابير البالغين.
 */
export function buildJuvenileInvestigationReferralJudicialDecision(input: {
    decisionDate: string;
    courtName: string;
    courtCaseNumber: string;
    defendantIds: string[];
    childCaseId?: string;
    childCaseNumber?: string;
    referralLegalArticle?: string;
}): JudicialDecision {
    const title = INVESTIGATION_REFERRAL_JUVENILE_LABEL;
    const lines = [
        `إحالة الحدث إلى ${String(input.courtName ?? '').trim() || JUVENILE_TRIAL_COURT_NAME}.`,
        `رقم دعوى المحكمة: ${String(input.courtCaseNumber ?? '').trim() || '—'}`,
    ];
    const article = String(input.referralLegalArticle ?? '').trim();
    if (article) lines.push(`مادة الإحالة / الاتهام: ${article}`);
    const childNo = String(input.childCaseNumber ?? '').trim();
    const childId = String(input.childCaseId ?? '').trim();
    if (childNo || childId) {
        lines.push(`إضبارة المحكمة: ${childNo || childId}`);
    }
    const summary = lines.join('\n');
    const defendantIds = input.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    return {
        id: `jd_juv_ref_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        issuedAt: String(input.decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10),
        title,
        summary,
        decisionType: inferJudicialDecisionKind(title, summary),
        disposition: inferJudicialDisposition(title, summary, defendantIds),
        beneficiaryPartyIds: defendantIds,
        defendantIds,
        appeals: [],
        isLocked: true,
        proceduralTemplate: title,
        isAppealable: true,
        referredCourtName: String(input.courtName ?? '').trim() || JUVENILE_TRIAL_COURT_NAME,
        legalArticleBasis: article || undefined,
    };
}

