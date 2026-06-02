import type { CaseStage } from '../../LawyerShared';

export type StepperStageItem = {
    id: string;
    name: string;
    status: CaseStage['status'];
};

export function buildStepperStagesFromArray(
    stages: CaseStage[],
    activeStageIndex: number,
): { stepperStages: StepperStageItem[]; currentStageId: string } {
    const stepperStages: StepperStageItem[] = stages.map((stage, idx) => ({
        id: `stg_${idx + 1}`,
        name: stage.stageName ?? stage.name ?? '',
        status:
            idx === activeStageIndex
                ? 'active'
                : stage.status === 'completed' || stage.status === 'locked'
                  ? 'locked'
                  : 'future',
    }));

    return {
        stepperStages,
        currentStageId: `stg_${activeStageIndex + 1}`,
    };
}
