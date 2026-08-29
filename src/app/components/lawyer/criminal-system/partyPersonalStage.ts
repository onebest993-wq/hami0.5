import type { DefendantPersonalStage } from '@/app/types/criminal';
import type { CriminalDefendant, StageConclusion } from './criminalStore';
import {
    filterActiveInvestigationDefendants,
    normalizeInvestigationDefendantStatus,
} from './investigationDefendantPurge';
import { getUnknownIdentityDefendants, isDefendantIdentityUnknown } from './criminalUnknownDefendant';
import {
    isInvestigationObjectiveFinalClosureTemplate,
    purgeDecisionIncludesUnknownDefendants,
} from './proceduralRequestTypes';

export type { DefendantPersonalStage } from '@/app/types/criminal';

const TERMINAL_PERSONAL_STAGES: DefendantPersonalStage[] = [
    'lawsuit_dropped_death',
    'lawsuit_dropped',
    'acquitted',
    'convicted',
    'released_temporary',
];

export function defaultPersonalStage(): DefendantPersonalStage {
    return 'under_investigation';
}

export function isTerminalPersonalStage(stage: DefendantPersonalStage | undefined): boolean {
    return TERMINAL_PERSONAL_STAGES.includes(stage ?? 'under_investigation');
}

export function personalStageLabel(stage: DefendantPersonalStage): string {
    if (stage === 'under_investigation') return 'تحقيق';
    if (stage === 'referred_to_trial') return 'إحالة للمحاكمة';
    if (stage === 'acquitted') return 'براءة';
    if (stage === 'convicted') return 'إدانة';
    if (stage === 'released_temporary') return 'إفراج';
    if (stage === 'lawsuit_dropped') return 'سقوط الدعوى';
    return 'سقوط — وفاة';
}

/** مراحل لا تُستدعي انشطار مسار الإضبارة — الوفاة/سقوط الدعوى تُعرض كبطاقة مقفلة فقط. */
const NON_PATH_SPLIT_PERSONAL_STAGES: DefendantPersonalStage[] = [
    'lawsuit_dropped_death',
    'lawsuit_dropped',
];

function isPathSplitPersonalStage(stage: DefendantPersonalStage | undefined): boolean {
    const s = stage ?? defaultPersonalStage();
    return !NON_PATH_SPLIT_PERSONAL_STAGES.includes(s);
}

/** انشطار مصائر المتهمين — فقط عند تفريق إجرائي حقيقي (مثلاً إحالة لمحاكمة مع بقاء آخر في التحقيق). */
export function hasDivergentDefendantFates(defendants: CriminalDefendant[]): boolean {
    const list = Array.isArray(defendants) ? defendants : [];
    if (list.length < 2) return false;
    const activePathStages = list
        .map((d) => d.personalStage ?? defaultPersonalStage())
        .filter((s) => isPathSplitPersonalStage(s));
    if (activePathStages.length < 2) return false;
    const stages = new Set(activePathStages);
    return stages.size > 1;
}

export function personalStageForDecision(
    decisionType: StageConclusion['decisionType'],
    expirationReason?: StageConclusion['expirationReason'],
): DefendantPersonalStage | null {
    if (decisionType === 'referral') return 'referred_to_trial';
    if (decisionType === 'conviction') return 'convicted';
    if (decisionType === 'acquittal') return 'acquitted';
    if (decisionType === 'release' || decisionType === 'temporary_release_insufficient_evidence') {
        return 'released_temporary';
    }
    if (decisionType === 'cassation_quash_acquit_release') return 'acquitted';
    if (decisionType === 'expiration') {
        if (expirationReason === 'death') return 'lawsuit_dropped_death';
        if (expirationReason === 'statute_of_limitations') return 'lawsuit_dropped';
        return 'released_temporary';
    }
    if (decisionType === 'return_investigation_deficiency' || decisionType === 'cassation_quash_investigation') {
        return 'under_investigation';
    }
    if (
        decisionType === 'misdemeanor_to_felony_jurisdiction' ||
        decisionType === 'felony_to_misdemeanor_jurisdiction' ||
        decisionType === 'trial_cassation_appeal' ||
        decisionType === 'cassation_quash_remand' ||
        decisionType === 'cassation_quash_trial_misdemeanor' ||
        decisionType === 'cassation_quash_trial_felony'
    ) {
        return 'referred_to_trial';
    }
    return null;
}

function filterSelectableDefendantsCore(
    defendants: CriminalDefendant[],
    includeUnknown: boolean,
): CriminalDefendant[] {
    return filterActiveInvestigationDefendants(
        (Array.isArray(defendants) ? defendants : []).filter((d) => {
            if (!includeUnknown && isDefendantIdentityUnknown(d)) return false;
            const ps = d.personalStage ?? defaultPersonalStage();
            return ps !== 'lawsuit_dropped_death' && ps !== 'lawsuit_dropped';
        }),
    );
}

/** متهمون قابلون للاختيار في قرارات شخصية (إحالة، توقيف، كفالة…) — بدون المجهول. */
export function filterSelectableDefendantsForScope(defendants: CriminalDefendant[]): CriminalDefendant[] {
    return filterSelectableDefendantsCore(defendants, false);
}

/**
 * متهمون قابلون لإدراج قرار ختامي في محكمة الموضوع —
 * لا يُشترط investigationStatus «active» (بعد الإحالة يكون referred).
 */
export function filterSelectableDefendantsForTrialFinalDecision(
    defendants: CriminalDefendant[],
): CriminalDefendant[] {
    return (Array.isArray(defendants) ? defendants : []).filter((d) => {
        if (isDefendantIdentityUnknown(d)) return false;
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

/** نطاق غلق/صلح/تفريق في الواجهة — المعلومون فقط (المجهول يُعرض كصف محظور). */
export function filterSelectableDefendantsForPurgeScope(defendants: CriminalDefendant[]): CriminalDefendant[] {
    return filterSelectableDefendantsForScope(defendants);
}

function activeUnknownDefendantIds(defendants: CriminalDefendant[]): string[] {
    return filterActiveInvestigationDefendants(getUnknownIdentityDefendants(defendants)).map((d) => d.id);
}

/** يُضمّن المجهول تلقائياً في غلق مؤقت/تفريق — دون اختيار يدوي. */
export function expandPurgeScopeWithAutoUnknownDefendants(
    defendants: CriminalDefendant[],
    scopedIds: string[],
    proceduralTemplate?: string,
): string[] {
    if (!purgeDecisionIncludesUnknownDefendants(proceduralTemplate)) {
        return scopedIds;
    }
    const unknownIds = activeUnknownDefendantIds(defendants);
    if (!unknownIds.length) return scopedIds;
    return [...new Set([...scopedIds, ...unknownIds])];
}

function resolveSelectableDefendantsForDecisionScope(defendants: CriminalDefendant[]): CriminalDefendant[] {
    return filterSelectableDefendantsForScope(defendants);
}

/** متهمون نشطون في التحقيق فقط — للإحالة واليوميات. */
export { filterActiveInvestigationDefendants, normalizeInvestigationDefendantStatus };

/** يُعرض اختيار «على من يسري القرار» عند تعدد المتهمين القابلين للاختيار أو وجود مجهول بجانب معلوم. */
export function shouldShowDefendantDecisionScopePicker(
    defendants: CriminalDefendant[],
    proceduralTemplate?: string,
): boolean {
    const selectable = resolveSelectableDefendantsForDecisionScope(defendants);
    if (selectable.length > 1) return true;
    const all = Array.isArray(defendants) ? defendants : [];
    const hasUnknown = all.some((d) => isDefendantIdentityUnknown(d));
    if (!hasUnknown) return false;
    if (!purgeDecisionIncludesUnknownDefendants(proceduralTemplate)) {
        return selectable.length > 1;
    }
    return selectable.length >= 1 || hasUnknown;
}

export function resolveEffectiveDefendantScopeIds(
    defendants: CriminalDefendant[],
    selectedIds: string[],
    proceduralTemplate?: string,
): string[] {
    if (isInvestigationObjectiveFinalClosureTemplate(proceduralTemplate)) {
        return (Array.isArray(defendants) ? defendants : []).map((d) => d.id).filter(Boolean);
    }

    const selectable = resolveSelectableDefendantsForDecisionScope(defendants);
    const selected = (Array.isArray(selectedIds) ? selectedIds : [])
        .map((id) => String(id ?? '').trim())
        .filter(Boolean);
    const identifiedOnly = selected.filter((id) => selectable.some((d) => d.id === id));

    let ids: string[];
    if (!selectable.length) {
        ids = purgeDecisionIncludesUnknownDefendants(proceduralTemplate)
            ? activeUnknownDefendantIds(defendants)
            : [];
    } else if (selectable.length === 1 && !identifiedOnly.length) {
        ids = [selectable[0]!.id];
    } else {
        ids = identifiedOnly;
    }

    return expandPurgeScopeWithAutoUnknownDefendants(defendants, ids, proceduralTemplate);
}

export function decisionRequiresDefendantScope(decisionType: string): boolean {
    return (
        decisionType === 'referral' ||
        decisionType === 'conviction' ||
        decisionType === 'acquittal' ||
        decisionType === 'release' ||
        decisionType === 'expiration' ||
        decisionType === 'return_investigation_deficiency' ||
        decisionType === 'misdemeanor_to_felony_jurisdiction' ||
        decisionType === 'felony_to_misdemeanor_jurisdiction' ||
        decisionType === 'trial_cassation_appeal' ||
        decisionType === 'cassation_quash_investigation' ||
        decisionType === 'cassation_quash_trial_misdemeanor' ||
        decisionType === 'cassation_quash_trial_felony' ||
        decisionType === 'cassation_quash_remand' ||
        decisionType === 'cassation_quash_acquit_release' ||
        decisionType === 'cassation_confirm' ||
        decisionType === 'cassation_quash_reduce' ||
        decisionType === 'closing' ||
        decisionType === 'temporary_closing' ||
        decisionType === 'case_split_fugitive_referral' ||
        decisionType === 'case_severance' ||
        decisionType === 'temporary_release_insufficient_evidence' ||
        decisionType === 'default_judgment_issue' ||
        decisionType === 'default_judgment_opposition'
    );
}

export function eventTouchesDefendant(
    event: { defendantIds?: string[]; targetDefendantId?: string | null },
    defendantId: string,
): boolean {
    const id = String(defendantId ?? '').trim();
    if (!id) return false;
    if (event.targetDefendantId === id) return true;
    const ids = Array.isArray(event.defendantIds) ? event.defendantIds : [];
    if (!ids.length) return true;
    return ids.includes(id);
}
