import type { CriminalCase, StageConclusion } from './criminalStore';

/** يطبّع نطاق المتهمين المستهدفين من القرار — أولوية targetDefendantIds. */
export function normalizeDecisionTargetIds(conclusion: StageConclusion): string[] {
    const raw = conclusion.targetDefendantIds ?? conclusion.defendantIds ?? [];
    return (Array.isArray(raw) ? raw : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

/** يُجهّز قراراً ختامياً لـ issueStageDecision مع نطاق متهمين صريح. */
export function scopeStageConclusionTargets(conclusion: StageConclusion): StageConclusion {
    const ids = normalizeDecisionTargetIds(conclusion);
    return {
        ...conclusion,
        targetDefendantIds: ids.length ? ids : undefined,
        defendantIds: ids.length ? ids : undefined,
    };
}

/** هل يجب تطبيق أثر القرار على كل المتهمين عند غياب النطاق؟ */
function conclusionAppliesToAllWhenUnscoped(decisionType: StageConclusion['decisionType']): boolean {
    return (
        decisionType === 'conviction' ||
        decisionType === 'closing' ||
        decisionType === 'temporary_closing' ||
        decisionType === 'cassation_confirm' ||
        decisionType === 'cassation_quash_reduce'
    );
}

export function resolvePersonalStageTargets(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): string[] {
    const ids = normalizeDecisionTargetIds(conclusion);
    if (ids.length) return ids;
    if (conclusionAppliesToAllWhenUnscoped(conclusion.decisionType)) {
        return (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
    }
    return [];
}

