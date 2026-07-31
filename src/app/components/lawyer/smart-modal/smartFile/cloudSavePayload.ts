import type { CaseStage } from '../../LawyerShared';
import type { SmartFileParentData } from './parentDataInit';
import { resolveDisplayParties } from './resolveDisplayParties';

/** Strip non-JSON-safe values before localStorage / cloud handoff. */
export function sanitizeForPersist<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_key, v) => {
            if (typeof v === 'function' || typeof v === 'symbol') return undefined;
            if (v instanceof Date) return v.toISOString();
            return v;
        }),
    ) as T;
}

export function buildCloudSavePayload(
    updatedStages: CaseStage[],
    updatedParent: SmartFileParentData,
    activeStageIndex: number,
    status: string,
): Record<string, unknown> {
    const active = updatedStages[activeStageIndex] as CaseStage & {
        caseNo?: string;
        court?: string;
        stageName?: string;
        judge?: string;
        docType?: string;
        claimValue?: string;
        parties?: unknown;
        tasks?: unknown;
    };
    // Prefer the active stage (source of truth after edits) over stale parent fields.
    const pickField = (
        stageVal: unknown,
        parentVal: unknown,
    ): string | undefined => {
        const fromStage = typeof stageVal === 'string' ? stageVal.trim() : '';
        if (fromStage) return fromStage;
        const fromParent = typeof parentVal === 'string' ? parentVal.trim() : '';
        return fromParent || undefined;
    };
    const parentCaseNo = pickField(active?.caseNo, updatedParent.caseNo);
    const parentCourt = pickField(active?.court, updatedParent.court);
    const parentDocType = pickField(
        active?.docType ?? (active as { type?: string } | undefined)?.type,
        updatedParent.docType,
    );
    const parentClaimValue = pickField(active?.claimValue, updatedParent.claimValue);
    const parentJudge = pickField(active?.judge, updatedParent.judge);
    const consolidationRefs =
        updatedParent.consolidationSecondaryRefs ??
        (active as CaseStage & { consolidatedSecondaryRefs?: unknown })?.consolidatedSecondaryRefs;

    const resolvedParties = resolveDisplayParties({
        displayStage: active as CaseStage,
        file: updatedParent as Record<string, unknown>,
        parentData: updatedParent,
        allStages: updatedStages,
    });

    return sanitizeForPersist({
        ...updatedParent,
        id: updatedParent.id,
        stages: updatedStages,
        activeStageIndex,
        status,
        caseNo: parentCaseNo,
        court: parentCourt,
        judge: parentJudge,
        docType: parentDocType ?? updatedParent.docType,
        claimValue: parentClaimValue,
        currentStage: active?.stageName,
        parties: resolvedParties,
        history: active?.timeline,
        tasks: active?.tasks,
        caseLinks: updatedParent.caseLinks,
        consolidationSecondaryRefs: consolidationRefs,
    });
}
