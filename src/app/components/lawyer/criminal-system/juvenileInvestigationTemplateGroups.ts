import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalDefendant } from './criminalStore';
import {
    CUSTOM_JUDICIAL_DECISION_TYPE,
    INVESTIGATION_PURGE_JUDICIAL_TEMPLATES,
    ASSET_SEIZURE_TEMPLATE,
    isCustomJudicialTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isInvestigationSharedOrderTemplate,
    isInvestigationExpirationJudicialTemplate,
    isInvestigationPurgeDecisionTemplate,
    isAssetSeizureTemplate,
    isJuvenileExclusiveInvestigationPurgeTemplate,
    isJuvenileJudgeDecisionTemplate,
    isJudicialDecisionTemplate,
    formatJudicialTemplateDisplayLabel,
    JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES,
    judicialDecisionModalTemplates,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import {
    isInvestigationAdultDefendantTargetTemplate,
    selectedInvestigationDefendantsAllJuvenile,
    selectedInvestigationDefendantsIncludeJuvenile,
    resolveInvestigationDefendantsPartyMix,
    type InvestigationDefendantsPartyMix,
} from './juvenileInvestigationCore';

export type { InvestigationDefendantsPartyMix };
export { resolveInvestigationDefendantsPartyMix };

export const JUVENILE_JUDGE_DECISION_OPTGROUP_LABEL = 'قرارات قاضي الأحداث';
export const COMMON_JUDICIAL_OPTGROUP_LABEL = 'قرارات مشتركة';
export const ADULT_JUDGE_DECISION_OPTGROUP_LABEL = 'قرارات القاضي (بالغ)';

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

/** قرارات مشتركة — بالغ، حدث، أو مختلط (غلق، صلح، استقدام، قبض…). */
function resolveInvestigationCommonJudicialTemplates(
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
function resolveInvestigationAdultOnlyJudicialTemplates(
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
function resolveInvestigationJuvenileExclusiveTemplates(): readonly string[] {
    return [...JUVENILE_EXCLUSIVE_JUDGE_DECISION_TEMPLATES];
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

function formatDecisionsPartyScopeShortLabel(scope: DecisionsPartyScope): string {
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

