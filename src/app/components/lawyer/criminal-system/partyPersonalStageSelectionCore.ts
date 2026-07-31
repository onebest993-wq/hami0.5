import type { CriminalDefendant } from './criminalStore';
import { isDefendantIdentityUnknownLite } from './criminalDefendantLiteCore';
import { defaultPersonalStage, isTerminalPersonalStage } from './partyPersonalStageCore';

function normalizeInvestigationDefendantStatus(
    raw: unknown,
): 'active' | 'closed_pending' | 'closed_final' | 'referred' {
    const v = String(raw ?? '').trim();
    if (v === 'closed_pending' || v === 'closed_final' || v === 'referred') return v;
    return 'active';
}

function filterActiveInvestigationDefendants(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        const status = normalizeInvestigationDefendantStatus(d.investigationStatus);
        return status === 'active';
    });
}

function filterSelectableDefendantsCore(
    defendants: CriminalDefendant[],
    includeUnknown: boolean,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(
        (Array.isArray(defendants) ? defendants : []).filter((d) => {
            if (!includeUnknown && isDefendantIdentityUnknownLite(d)) return false;
            const ps = d.personalStage ?? defaultPersonalStage();
            return ps !== 'lawsuit_dropped_death' && ps !== 'lawsuit_dropped';
        }),
    );
}

export function filterSelectableDefendantsForScope(defendants: CriminalDefendant[]): CriminalDefendant[] {
    return filterSelectableDefendantsCore(defendants, false);
}

export function filterSelectableDefendantsForTrialFinalDecision(
    defendants: CriminalDefendant[],
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        if (isDefendantIdentityUnknownLite(d)) return false;
        const ps = d.personalStage ?? defaultPersonalStage();
        if (ps === 'lawsuit_dropped_death' || ps === 'lawsuit_dropped') return false;
        if (isTerminalPersonalStage(ps)) return false;
        return true;
    });
}

export function resolveTrialFinalDecisionScopeIds(
    defendants: CriminalDefendant[],
    selectedIds: string[],
): string[] {
    const selectable = filterSelectableDefendantsForTrialFinalDecision(defendants);
    const selected = (Array.isArray(selectedIds) ? selectedIds : [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean);
    const identifiedOnly = selected.filter((id) => selectable.some((d) => d.id === id));
    if (!selectable.length) return [];
    if (selectable.length === 1) return [selectable[0]!.id];
    return identifiedOnly;
}

export function resolveEffectiveDefendantScopeIds(
    defendants: CriminalDefendant[],
    selectedIds: string[],
): string[] {
    const selectable = filterSelectableDefendantsForScope(defendants);
    const selected = (Array.isArray(selectedIds) ? selectedIds : [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean);
    const identifiedOnly = selected.filter((id) => selectable.some((d) => d.id === id));
    if (!selectable.length) return [];
    if (selectable.length === 1 && !identifiedOnly.length) {
        return [selectable[0]!.id];
    }
    return identifiedOnly;
}

