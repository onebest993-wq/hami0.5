import type { OurRepresentation } from './criminalStore';
import type { CriminalActionParty } from './criminalStageUtils';
import type { DecisionsPartyScope } from './juvenileInvestigationRules';
import { filterPartiesByDecisionsScope } from './juvenileInvestigationRules';
import {
    ASSET_SEIZURE_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    isCustomJudicialTemplate,
    isOrderEnforcementTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';

/** أهلية المشتكي لقرارات تقييد الحرية — فقط المشتكي المتقابل (متهم ضمنياً). */
export function isAccusedComplainantParty(party: CriminalActionParty): boolean {
    return party.source === 'complainant' && party.isAccusedAsComplainant === true;
}

export function isDefendantTargetRequestTemplate(template: string | undefined): boolean {
    const key = normalizeProceduralRequestTemplate(String(template ?? '').trim());
    return (
        isOrderEnforcementTemplate(key) ||
        key === DETENTION_DECISION_TEMPLATE ||
        key === DEFENDANT_BAIL_TEMPLATE ||
        key === ASSET_SEIZURE_TEMPLATE
    );
}

/** أطراف قابلة للاختيار حسب نوع الإجراء وتمثيل المحامي. */
export function filterPartiesForRequestTemplate(
    parties: CriminalActionParty[],
    template: string | undefined,
    representation?: OurRepresentation,
    decisionsScope?: DecisionsPartyScope,
): CriminalActionParty[] {
    let alive = parties.filter((p) => !p.isDeceased);
    if (decisionsScope) {
        alive = filterPartiesByDecisionsScope(alive, decisionsScope);
    }
    if (isDefendantTargetRequestTemplate(template)) {
        /** توقيف/قبض/استقدام/تكفيل/حجز أموال — المتهمون حصراً (لا مشتكي عادي ولا متقابل في الواجهة). */
        return alive.filter((p) => p.source === 'defendant');
    }
    /**
     * 🧪 القرار القضائي اليدوي المخصّص: قرارٌ قضائيٌّ صَرف، فالقاضي يَملك سُلطة استهداف
     *    أيّ طرفٍ في الإضبارة بغضّ النَّظر عن تمثيل المحامي. لذلك نَتجاوز فلتر
     *    `representation` ونُعيد كل الأطراف الأحياء (مع خَيار «إجرائي عام» في الواجهة).
     */
    if (isCustomJudicialTemplate(template)) {
        return alive;
    }
    if (representation === 'defendant_side') {
        return alive.filter((p) => p.source === 'defendant');
    }
    if (representation === 'complainant_side') {
        return alive.filter((p) => p.source === 'complainant');
    }
    return alive;
}

export type ResolveAutoRequestPartyInput = {
    isUnknownPerpetrator: boolean;
    isDefense: boolean;
    complainantsCount: number;
    defendantsCount: number;
};

export function resolveAutoRequestPartyId(
    parties: CriminalActionParty[],
    template: string | undefined,
    ctx: ResolveAutoRequestPartyInput,
    representation?: OurRepresentation,
    decisionsScope?: DecisionsPartyScope,
): string | null {
    if (ctx.isUnknownPerpetrator) return null;
    const eligible = filterPartiesForRequestTemplate(parties, template, representation, decisionsScope);
    if (isDefendantTargetRequestTemplate(template)) {
        if (eligible.length === 1) return eligible[0]!.id;
        return null;
    }
    if (eligible.length === 1) return eligible[0]!.id;
    if (ctx.complainantsCount === 1 && ctx.defendantsCount === 1) {
        const sole = ctx.isDefense
            ? eligible.find((p) => p.source === 'defendant')
            : eligible.find((p) => p.source === 'complainant');
        return sole?.id ?? null;
    }
  if (ctx.isDefense && representation === 'defendant_side' && eligible.length === 1) {
        return eligible[0]!.id;
    }
    if (!ctx.isDefense && representation === 'complainant_side' && eligible.length === 1) {
        return eligible[0]!.id;
    }
    return null;
}

/** يُظهر محدّد الشخص فقط عند تعدد الأطراف المؤهّلين (انفراد = اختيار ضمني). */
export function shouldShowMultiPartySelectionPicker(eligibleCount: number): boolean {
    return eligibleCount > 1;
}

export function shouldShowRequestPartyPicker(
    parties: CriminalActionParty[],
    template: string | undefined,
    autoPartyId: string | null,
    isUnknownPerpetrator: boolean,
    representation?: OurRepresentation,
    decisionsScope?: DecisionsPartyScope,
): boolean {
    if (isUnknownPerpetrator || autoPartyId) return false;
    const tpl = String(template ?? '').trim();
    if (!tpl) return false;
    const eligible = filterPartiesForRequestTemplate(parties, template, representation, decisionsScope);
    return shouldShowMultiPartySelectionPicker(eligible.length);
}

export function resolveRequestPartyIdsForPayload(
    selectedIds: string[],
    autoPartyId: string | null,
    parties: CriminalActionParty[],
    template: string | undefined,
    representation: OurRepresentation,
    ctx: ResolveAutoRequestPartyInput,
    decisionsScope?: DecisionsPartyScope,
): string[] | undefined {
    const auto =
        autoPartyId ?? resolveAutoRequestPartyId(parties, template, ctx, representation, decisionsScope);
    if (auto) return [auto];
    const cleaned = selectedIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    const eligible = new Set(
        filterPartiesForRequestTemplate(parties, template, representation, decisionsScope).map((p) => p.id),
    );
    const filtered = cleaned.filter((id) => eligible.has(id));
    if (filtered.length) return filtered;
    if (representation === 'defendant_side' && isDefendantTargetRequestTemplate(template)) {
        const defs = filterPartiesForRequestTemplate(parties, template, representation);
        if (defs.length === 1) return [defs[0]!.id];
    }
    return undefined;
}
