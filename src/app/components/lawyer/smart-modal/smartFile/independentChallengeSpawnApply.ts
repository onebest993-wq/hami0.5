import type { CaseStage, FileData } from '../../LawyerShared';
import type { IndependentChallengeSpawnInput } from '@/app/domain/lawsuit/independentChallengeDossier';
import { applyAppealStageTransition, type AppealTransitionParams } from './appealStageTransitionApply';

export function buildIndependentChallengeSpawnInput(params: {
    sourceFileId: number;
    stages: CaseStage[];
    sourceStageIndex: number;
    sourceStage: CaseStage;
    hop: AppealTransitionParams;
    sourceFile?: FileData | null;
}): IndependentChallengeSpawnInput | { error: string } {
    const isolated = applyAppealStageTransition(
        [params.sourceStage],
        0,
        params.sourceStage,
        params.hop,
    );
    const appealStage = isolated.updatedStages[isolated.newActiveIndex];
    if (!appealStage || isolated.independentRequired) {
        return { error: 'تعذّر برمجة إضبارة الطعن المستقل' };
    }
    const sourceFile = params.sourceFile
        ? {
              ...params.sourceFile,
              stages: params.stages,
              activeStageIndex: params.sourceStageIndex,
          }
        : undefined;
    const sourceFileId = Number(sourceFile?.id ?? params.sourceFileId);
    if (!Number.isFinite(sourceFileId)) {
        return { error: 'تعذّر برمجة إضبارة الطعن المستقل' };
    }
    return {
        sourceFileId,
        sourceStages: params.stages,
        sourceStageIndex: params.sourceStageIndex,
        appealStage,
        appealType: params.hop.appealType,
        filingDate: params.hop.filingDate,
        newCaseNumber: params.hop.newCaseNumber,
        newCourt: params.hop.newCourt,
        ...(sourceFile ? { sourceFile } : {}),
    };
}
