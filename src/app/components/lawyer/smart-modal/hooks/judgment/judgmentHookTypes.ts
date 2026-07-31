import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage } from '../../../LawyerShared';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type { JudgmentPayload } from '../../smartFile/judgmentTypes';

export type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: SmartFileParentData,
    stageIndex?: number,
    statusOverride?: string,
) => void;

export type UseSmartFileJudgmentActionsOptions = {
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: Dispatch<SetStateAction<number>>;
    setViewingStageIndex: Dispatch<SetStateAction<number>>;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    saveToCloud: SaveToCloud;
    setStatus: Dispatch<SetStateAction<string>>;
    tempJudgmentData: JudgmentPayload | null;
    setTempJudgmentData: (v: JudgmentPayload | null) => void;
    setShowAppealTransitionModal: (v: boolean) => void;
    setShowAppealModal: (v: boolean) => void;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    setShowJudgmentModal: (v: boolean) => void;
    setShowCrossAppealModal: (v: boolean) => void;
    setShowTransitionModal: (v: boolean) => void;
    status: string;
};
