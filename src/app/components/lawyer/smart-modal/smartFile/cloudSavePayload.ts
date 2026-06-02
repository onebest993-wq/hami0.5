import type { CaseStage } from '../../LawyerShared';
import type { SmartFileParentData } from './parentDataInit';

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
        parties?: unknown;
        tasks?: unknown;
    };
    return {
        ...updatedParent,
        id: updatedParent.id,
        stages: updatedStages,
        activeStageIndex,
        status,
        caseNo: active?.caseNo,
        court: active?.court,
        currentStage: active?.stageName,
        parties: active?.parties,
        history: active?.timeline,
        tasks: active?.tasks,
    };
}
