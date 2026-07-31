import type { CaseStage } from '../../../../LawyerShared';
import type { JudgmentPayload } from '../../../smartFile/judgmentTypes';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';

export type JudgmentConfirmScope = Pick<
    UseSmartFileJudgmentActionsOptions,
    'stages' | 'currentStage' | 'activeStageIndex' | 'parentData' | 'setStatus' | 'setActiveStageIndex'
>;

export type JudgmentConfirmRuntime = {
    judgmentData: JudgmentPayload;
    action: string;
    judgmentType: string;
    judgmentForm: string;
    judgmentDate: string;
    notes: string;
    nextStage: string;
    now: Date;
    stageName: string;
    addDays: (date: Date, days: number) => string;
    updatedStages: CaseStage[];
    handled: boolean;
    successToast: string;
    openAppealModalAfterSave: boolean;
    openObjectionModalAfterSave: boolean;
    remandNewActiveIndex: number | null;
    nextCaseStatus?: string;
};
