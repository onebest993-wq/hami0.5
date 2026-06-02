import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { CaseStage } from '../../LawyerShared';

export function createBlankChildStage(newStageName: string, parentStageType?: string): CaseStage {
    return {
        id: `stage_${Date.now()}`,
        name: newStageName,
        stageName: newStageName,
        type: parentStageType || 'lawsuit',
        caseNo: '',
        court: '',
        judge: '',
        parties: [
            { role: 'صفة الطرف الأول', name: '', type: 'individual' },
            { role: 'صفة الطرف الثاني', name: '', type: 'individual', notificationStatus: 'waiting' },
        ],
        timeline: [],
        tasks: [],
        incidentalCases: [],
        createdDate: getLocalTodayYmd(),
        finalDecision: null,
        decisionDate: null,
        status: 'active',
    } as unknown as CaseStage;
}

export type StageTransitionInput = {
    newStage: string;
    result: string;
    date: string;
};

export function applyStageTransition(
    stages: CaseStage[],
    activeStageIndex: number,
    currentStage: CaseStage,
    input: StageTransitionInput,
): { updatedStages: CaseStage[]; newActiveIndex: number } {
    const updatedStages = [...stages];
    updatedStages[activeStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: input.result,
        decisionDate: input.date,
    } as CaseStage;

    const child = createBlankChildStage(input.newStage, (currentStage as CaseStage & { type?: string }).type);
    updatedStages.push(child);

    return {
        updatedStages,
        newActiveIndex: updatedStages.length - 1,
    };
}
