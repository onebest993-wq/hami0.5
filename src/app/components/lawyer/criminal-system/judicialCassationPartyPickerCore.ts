import type { JudicialAppellantType, JudicialDecision } from '@/app/types/criminal';
import type { CriminalActionParty } from './criminalPartyLabelCore';
import {
    BAIL_RELEASE_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTemplateCassationCore';

export function filterDefendantPartiesForDecision(
    parties: CriminalActionParty[],
    decision: JudicialDecision | null | undefined,
): CriminalActionParty[] {
    const defendants = parties.filter((p) => p.source === 'defendant');
    const scope = Array.isArray(decision?.defendantIds)
        ? decision!.defendantIds.map((id) => String(id ?? '').trim()).filter(Boolean)
        : null;
    if (!scope?.length) return defendants;
    const allowed = new Set(scope);
    return defendants.filter((p) => allowed.has(p.id));
}

export function resolveAutoAppellantSideForDecision(
    decision: JudicialDecision | null | undefined,
): JudicialAppellantType | null {
    if (!decision) return null;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (template === DETENTION_DECISION_TEMPLATE) return 'defendant';
    if (template === 'قرار الحجز على الأموال') return 'defendant';
    if (template === BAIL_RELEASE_TEMPLATE) return 'complainant';
    return null;
}

export function resolveAutoAppellantPartyIds(
    decision: JudicialDecision | null | undefined,
    appellantSide: JudicialAppellantType,
    parties: Pick<CriminalActionParty, 'id' | 'source'>[],
): string[] {
    if (!decision) return [];
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (appellantSide === 'defendant' && template === DETENTION_DECISION_TEMPLATE) {
        return (decision.defendantIds ?? []).filter((id) =>
            parties.some((p) => p.source === 'defendant' && p.id === id),
        );
    }
    if (appellantSide === 'complainant' && template === BAIL_RELEASE_TEMPLATE) {
        return parties.filter((p) => p.source === 'complainant').map((p) => p.id);
    }
    return [];
}

