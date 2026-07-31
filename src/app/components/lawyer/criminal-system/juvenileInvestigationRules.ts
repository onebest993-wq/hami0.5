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
    type JuvenileDetentionPlacement,
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

function isInvestigationAdultDefendantTargetTemplate(template: string | undefined): boolean {
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

/** خيار إيداع/توقيف الحدث في التحقيق — دار الملاحظة فقط. */
export const INVESTIGATION_JUVENILE_DETENTION_PLACEMENT_OPTIONS: ReadonlyArray<{
    value: JuvenileDetentionPlacement;
    label: string;
}> = [
    {
        value: 'juvenile_observation',
        label: JUVENILE_INVESTIGATION_DETENTION_AUTHORITY,
    },
] as const;

export function investigationJuvenileDetentionAuthorityLabel(): string {
    return JUVENILE_INVESTIGATION_DETENTION_AUTHORITY;
}

export function isJuvenileInvestigationDetentionDecision(template: string): boolean {
    return String(template ?? '').trim() === DETENTION_DECISION_TEMPLATE;
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

export function isJuvenileSocialInquiryReportMissing(defendant: {
    socialInquiryReport?: {
        workflowStatus?: string;
        isAttached?: boolean;
        receivedDate?: string;
    };
}): boolean {
    const ws = String(defendant?.socialInquiryReport?.workflowStatus ?? '').trim();
    if (ws === 'submitted') return false;
    if (defendant?.socialInquiryReport?.isAttached === true) return false;
    const received = String(defendant?.socialInquiryReport?.receivedDate ?? '').trim();
    return !received;
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

export function judicialTemplatesForInvestigationJuvenile(
    templates: readonly string[],
    hasJuvenileDefendant: boolean,
): readonly string[] {
    if (!hasJuvenileDefendant) return templates;
    const seen = new Set<string>();
    const next: string[] = [];
    for (const t of [SOCIAL_INQUIRY_REFERRAL_TEMPLATE, ...templates]) {
        if (seen.has(t)) continue;
        seen.add(t);
        next.push(t);
    }
    return next;
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

/** يستنتج حالة الإحالة من السجل الحالي دون تعديل يدوي في الواجهة. */
export function inferDefendantStatusAtDecisionFromRecord(
    defendant: Pick<CriminalDefendant, 'status'>,
): DefendantStatusAtDecision {
    const s = String(defendant.status ?? '').trim();
    if (s === 'هارب') return 'fugitive';
    if (
        s === 'موقوف' ||
        s === 'ملقى القبض عليه' ||
        s === 'juvenile_detention' ||
        s === 'psychiatric_eval'
    ) {
        return 'detained';
    }
    return 'bailed';
}

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

export function caseHasJuvenileDefendant(caseRecord: Pick<CriminalCase, 'defendants'>): boolean {
    return hasJuvenileAccused(Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []);
}

export type InvestigationDefendantsPartyMix = 'adults_only' | 'juveniles_only' | 'mixed';

export const JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL = 'قرارات قاضي الأحداث';
export const COMMON_JUDICIAL_OPTGROUP_LABEL = 'قرارات مشتركة';
export const ADULT_JUDGE_DECISION_OPTGROUP_LABEL = 'قرارات القاضي (بالغ)';

export function resolveInvestigationDefendantsPartyMix(
    defendants: CriminalDefendant[],
): InvestigationDefendantsPartyMix {
    const identified = defendants.filter((d) => !isDefendantIdentityUnknown(d));
    const withJuvenile = identified.some((d) => isInvestigationJuvenileCategoryDefendant(d));
    const withAdult = identified.some((d) => isInvestigationAdultCategoryDefendant(d));
    if (withJuvenile && withAdult) return 'mixed';
    if (withJuvenile) return 'juveniles_only';
    return 'adults_only';
}

export function investigationDossierHasMixedJuvenileAndAdult(
    defendants: CriminalDefendant[],
): boolean {
    return resolveInvestigationDefendantsPartyMix(defendants) === 'mixed';
}

export function investigationReferralScopeMixesJuvenileAndAdult(
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile'>>,
    selectedIds: string[],
): boolean {
    const ids = selectedIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    if (!ids.length) return false;
    if (!selectedInvestigationDefendantsIncludeJuvenile(defendants, ids)) return false;
    return !selectedInvestigationDefendantsAllJuvenile(defendants, ids);
}

export type DecisionsPartyScope = 'adult' | 'juvenile';

export function filterPartiesByDecisionsScope<T extends { id: string; isJuvenile?: boolean }>(
    parties: T[],
    scope: DecisionsPartyScope,
): T[] {
    return parties.filter((p) => Boolean(p.isJuvenile) === (scope === 'juvenile'));
}

export function filterDefendantsByDecisionsScope(
    defendants: CriminalDefendant[],
    scope: DecisionsPartyScope,
): CriminalDefendant[] {
    return defendants.filter((d) => Boolean(d.isJuvenile) === (scope === 'juvenile'));
}

/** تصفية سجل القرارات حسب نطاق البالغ/الحدث (بناءً على المتهمين المستهدفين). */
export function judicialDecisionMatchesPartyScope(
    decision: { defendantIds?: string[]; beneficiaryPartyIds?: string[] },
    scope: DecisionsPartyScope,
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile'>>,
): boolean {
    const raw = [
        ...(Array.isArray(decision.defendantIds) ? decision.defendantIds : []),
        ...(Array.isArray(decision.beneficiaryPartyIds) ? decision.beneficiaryPartyIds : []),
    ]
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (!raw.length) return scope === 'adult';
    const defById = new Map(defendants.map((d) => [d.id, d]));
    return raw.every((id) => {
        const hit = defById.get(id);
        if (!hit) return scope === 'adult';
        return Boolean(hit.isJuvenile) === (scope === 'juvenile');
    });
}

export function judicialTemplatesForPartyScope(
    scope: DecisionsPartyScope,
    options?: Parameters<typeof judicialDecisionModalTemplates>[1],
): readonly string[] {
    if (scope === 'juvenile') {
        return resolveJuvenileJudgeDecisionTemplates('juveniles_only', options);
    }
    const base = judicialDecisionModalTemplates(false, {
        ...options,
        hasJuvenileDefendant: false,
    });
    return base.filter((t) => !isJuvenileJudgeDecisionTemplate(t));
}

/** قرارات مشتركة — بالغ، حدث، أو مختلط (غلق، صلح، استقدام، قبض…). */
export function resolveInvestigationCommonJudicialTemplates(
    options?: Parameters<typeof judicialDecisionModalTemplates>[1],
): readonly string[] {
    const merged = judicialDecisionModalTemplates(false, options);
    return merged.filter((t) => {
        if (isJuvenileJudgeDecisionTemplate(t)) return false;
        if (isDetentionDecisionTemplate(t) || isDefendantBailTemplate(t) || isAssetSeizureTemplate(t)) {
            return false;
        }
        return true;
    });
}

/** قرارات حصرية للبالغ — توقيف، تكفيل، حجز أموال. */
export function resolveInvestigationAdultOnlyJudicialTemplates(
    options?: Parameters<typeof judicialDecisionModalTemplates>[1],
): readonly string[] {
    const merged = judicialDecisionModalTemplates(false, options);
    return merged.filter(
        (t) =>
            isDetentionDecisionTemplate(t) ||
            isDefendantBailTemplate(t) ||
            isAssetSeizureTemplate(t),
    );
}

/** قرارات حصرية لقاضي الأحداث — دار الملاحظة، التسليم، البحث الاجتماعي. */
export function resolveInvestigationJuvenileExclusiveTemplates(): readonly string[] {
    return [...JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES];
}

/** @deprecated — استخدم resolveInvestigationJuvenileExclusiveTemplates للقائمة المنسدلة. */
export function resolveJuvenileJudgeDecisionTemplates(
    mix: InvestigationDefendantsPartyMix,
    options?: Parameters<typeof judicialDecisionModalTemplates>[1],
): readonly string[] {
    const exclusive = resolveInvestigationJuvenileExclusiveTemplates();
    if (mix === 'juveniles_only') {
        return [...resolveInvestigationCommonJudicialTemplates(options), ...exclusive];
    }
    return exclusive;
}

/** هل القالب يُعامل كقرار قاضي أحداث في هذا التركيب؟ */
export function isJuvenileJudgeDecisionTemplateForMix(
    template: string | undefined,
    mix: InvestigationDefendantsPartyMix,
): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    if (isJuvenileJudgeDecisionTemplate(key)) return true;
    return mix === 'juveniles_only' && isJuvenileExclusiveInvestigationPurgeTemplate(key);
}

const JUDICIAL_SELECT_ADULT_PREFIX = '\u001ead\u001e';
const JUDICIAL_SELECT_JUVENILE_PREFIX = '\u001ejv\u001e';

/** يميّز خيارات استقدام/قبض المشتركة في الإضبارة المختلطة دون تكرار value في القائمة. */
export function encodeInvestigationJudicialSelectValue(
    template: string,
    groupScope: DecisionsPartyScope,
    mix: InvestigationDefendantsPartyMix,
): string {
    if (mix !== 'mixed' || !isInvestigationSharedOrderTemplate(template)) return template;
    return groupScope === 'juvenile'
        ? `${JUDICIAL_SELECT_JUVENILE_PREFIX}${template}`
        : `${JUDICIAL_SELECT_ADULT_PREFIX}${template}`;
}

export function decodeInvestigationJudicialSelectValue(raw: string): {
    template: string;
    groupScope: DecisionsPartyScope | null;
} {
    const v = String(raw ?? '').trim();
    if (v.startsWith(JUDICIAL_SELECT_JUVENILE_PREFIX)) {
        return { template: v.slice(JUDICIAL_SELECT_JUVENILE_PREFIX.length), groupScope: 'juvenile' };
    }
    if (v.startsWith(JUDICIAL_SELECT_ADULT_PREFIX)) {
        return { template: v.slice(JUDICIAL_SELECT_ADULT_PREFIX.length), groupScope: 'adult' };
    }
    return { template: v, groupScope: null };
}

/** نطاق المتهمين لقرار التحقيق — بالغ/حدث حسب المجموعة والتركيب. */
export function resolveInvestigationJudicialEntryScope(
    template: string | undefined,
    explicitGroupScope: DecisionsPartyScope | null | undefined,
    mix: InvestigationDefendantsPartyMix,
): DecisionsPartyScope | undefined {
    const tpl = String(template ?? '').trim();
    if (!tpl) return undefined;
    if (isJuvenileJudgeDecisionTemplateForMix(tpl, mix)) return 'juvenile';
    if (isInvestigationSharedOrderTemplate(tpl)) {
        if (explicitGroupScope) return explicitGroupScope;
        if (mix === 'juveniles_only') return 'juvenile';
        if (mix === 'adults_only') return 'adult';
        return undefined;
    }
    if (mix === 'juveniles_only') return undefined;
    if (
        isInvestigationAdultDefendantTargetTemplate(tpl) &&
        (isDefendantBailTemplate(tpl) ||
            isDetentionDecisionTemplate(tpl) ||
            isInvestigationSharedOrderTemplate(tpl))
    ) {
        return 'adult';
    }
    if (
        isJudicialDecisionTemplate(tpl) &&
        !isCustomJudicialTemplate(tpl) &&
        isInvestigationAdultDefendantTargetTemplate(tpl)
    ) {
        return 'adult';
    }
    return undefined;
}

export function formatDecisionsPartyScopeShortLabel(scope: DecisionsPartyScope): string {
    return scope === 'juvenile' ? 'حدث' : 'بالغ';
}

/** نص حاوية «لمن يخص القرار» في الإضبارة المختلطة. */
export function formatJudicialPartyScopeNoticeMessage(
    scope: DecisionsPartyScope,
    names: readonly string[] | undefined,
): string {
    const cleaned = (names ?? []).map((n) => String(n ?? '').trim()).filter(Boolean);
    const namesSuffix = cleaned.length ? ` (${cleaned.join('، ')})` : '';
    if (scope === 'juvenile') {
        return cleaned.length <= 1
            ? `هذا القرار يخص الحدث${namesSuffix}`
            : `هذا القرار يخص الأحداث${namesSuffix}`;
    }
    return cleaned.length <= 1
        ? `هذا القرار يخص المتهم البالغ${namesSuffix}`
        : `هذا القرار يخص المتهمين البالغين${namesSuffix}`;
}

/** عنوان القرار مع وسم (بالغ)/(حدث) — للقوائم والبطاقات. */
export function formatJudicialDisplayWithPartyScope(
    title: string | undefined,
    scope?: DecisionsPartyScope | null,
): string {
    const base = formatJudicialTemplateDisplayLabel(title);
    if (!scope) return base;
    return `${base} (${formatDecisionsPartyScopeShortLabel(scope)})`;
}

function collectDecisionTargetPartyIds(decision: JudicialDecision): string[] {
    const ids = [
        ...(Array.isArray(decision.defendantIds) ? decision.defendantIds : []),
        ...(Array.isArray(decision.beneficiaryPartyIds) ? decision.beneficiaryPartyIds : []),
    ]
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    return [...new Set(ids)];
}

/** يستنتج نطاق البالغ/الحدث من القرار المخزَّن — للعرض في السجل والبطاقات. */
export function resolveStoredJudicialDecisionPartyScope(
    decision: JudicialDecision,
    defendants: Array<Pick<CriminalDefendant, 'id' | 'isJuvenile'>>,
    partyMix?: InvestigationDefendantsPartyMix,
): DecisionsPartyScope | undefined {
    const mix = partyMix ?? resolveInvestigationDefendantsPartyMix(defendants);
    const tpl = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);

    if (isJuvenileJudgeDecisionTemplateForMix(tpl, mix)) return 'juvenile';

    const targetIds = collectDecisionTargetPartyIds(decision);
    if (targetIds.length) {
        const defById = new Map(defendants.map((d) => [d.id, d]));
        const targets = targetIds
            .map((id) => defById.get(id))
            .filter((d): d is Pick<CriminalDefendant, 'id' | 'isJuvenile'> => Boolean(d));
        if (targets.length) {
            if (targets.every((d) => Boolean(d.isJuvenile))) return 'juvenile';
            if (targets.every((d) => !d.isJuvenile)) return 'adult';
        }
    }

    return resolveInvestigationJudicialEntryScope(tpl, null, mix);
}

/** مجموعتا القائمة المنسدلة الموحّدة في مودال تسجيل القرار القضائي. */
export function buildInvestigationJudicialTemplateGroups(
    trialCourtManualOnly: boolean,
    options?: Parameters<typeof judicialDecisionModalTemplates>[1] & {
        defendantsPartyMix?: InvestigationDefendantsPartyMix;
    },
): { common: readonly string[]; juvenile: readonly string[]; adult: readonly string[] } {
    if (trialCourtManualOnly) {
        const manual = judicialDecisionModalTemplates(true, options);
        return { common: manual, juvenile: [], adult: [] };
    }
    const mix = options?.defendantsPartyMix ?? 'mixed';
    const common = resolveInvestigationCommonJudicialTemplates(options);
    const juvenile =
        mix === 'adults_only' ? [] : resolveInvestigationJuvenileExclusiveTemplates();
    const adult =
        mix === 'juveniles_only' ? [] : resolveInvestigationAdultOnlyJudicialTemplates(options);

    return { common, juvenile, adult };
}
