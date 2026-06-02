import type { DefendantPersonalStage } from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, StageConclusion } from './criminalStore';
import { defaultPersonalStage } from './partyPersonalStage';

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

/**
 * يحدّث personalStage للمتهمين المحددين فقط — البقية دون تغيير.
 */
export function applyPersonalStageToTargets(
    caseRecord: CriminalCase,
    targetDefendantIds: string[],
    personalStage: DefendantPersonalStage,
    patch?: Partial<Pick<CriminalDefendant, 'status' | 'isPartyRecordLocked'>>,
): CriminalCase {
    const idSet = new Set(
        (Array.isArray(targetDefendantIds) ? targetDefendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter(Boolean),
    );
    if (!idSet.size) return caseRecord;
    return {
        ...caseRecord,
        defendants: (caseRecord.defendants ?? []).map((d) => {
            if (!idSet.has(d.id)) return d;
            return {
                ...d,
                personalStage,
                ...patch,
            };
        }),
    };
}

/** هل يجب تطبيق أثر القرار على كل المتهمين عند غياب النطاق؟ */
export function conclusionAppliesToAllWhenUnscoped(decisionType: StageConclusion['decisionType']): boolean {
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

export function allDefendantsAtPersonalStage(
    defendants: CriminalCase['defendants'],
    stage: DefendantPersonalStage,
): boolean {
    const list = Array.isArray(defendants) ? defendants : [];
    if (!list.length) return false;
    return list.every((d) => (d.personalStage ?? defaultPersonalStage()) === stage);
}
