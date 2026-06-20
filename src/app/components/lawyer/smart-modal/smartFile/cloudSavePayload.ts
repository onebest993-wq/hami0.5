// @ts-nocheck
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
    const parentCaseNo =
        typeof updatedParent.caseNo === 'string' && updatedParent.caseNo.trim()
            ? updatedParent.caseNo.trim()
            : active?.caseNo;
    const parentCourt =
        typeof updatedParent.court === 'string' && updatedParent.court.trim()
            ? updatedParent.court.trim()
            : active?.court;
    const parentDocType =
        typeof updatedParent.docType === 'string' && updatedParent.docType.trim()
            ? updatedParent.docType.trim()
            : active?.docType;
    const parentClaimValue =
        typeof updatedParent.claimValue === 'string' && updatedParent.claimValue.trim()
            ? updatedParent.claimValue.trim()
            : active?.claimValue;
    const parentJudge =
        typeof updatedParent.judge === 'string' && updatedParent.judge.trim()
            ? updatedParent.judge.trim()
            : active?.judge;
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
