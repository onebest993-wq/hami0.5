import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { useSmartFileDefaultJudgmentActions } from './useSmartFileDefaultJudgmentActions';
import { useSmartFilePleadingsActions } from './useSmartFilePleadingsActions';
import { useSmartFileJudgmentActions } from './useSmartFileJudgmentActions';
import { shareCaseReport } from '../smartFile/shareCaseReport';
import {
    resolveSmartFileClientName,
    resolveSmartFileParentCaseNo,
    resolveSmartFileParentCourt,
} from '../smartFile/parentDataClientMeta';
import type { useSmartFileModalFlags } from './useSmartFileModalFlags';
import type { SaveToCloud } from './judgment/judgmentHookTypes';

type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;

type SmartFileModalJudgmentBundleParams = {
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: Dispatch<SetStateAction<number>>;
    setViewingStageIndex: Dispatch<SetStateAction<number>>;
    currentStage: CaseStage | undefined;
    parentData: Record<string, unknown>;
    saveToCloud: SaveToCloud;
    setStatus: Dispatch<SetStateAction<string>>;
    status: string;
    calendarUserId: string | undefined;
    lawsuitFileId: string | undefined;
    modalFlags: ModalFlags;
};

export function useSmartFileModalJudgmentBundle({
    stages,
    setStages,
    activeStageIndex,
    setActiveStageIndex,
    setViewingStageIndex,
    currentStage,
    parentData,
    saveToCloud,
    setStatus,
    status,
    calendarUserId,
    lawsuitFileId,
    modalFlags,
}: SmartFileModalJudgmentBundleParams) {
    const {
        setShowObjectionRegistrationModal,
        setShowAbsentJudgmentNotificationModal,
        setShowOpponentAbsentObjectionModal,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
    } = modalFlags;

    const defaultJudgmentActions = useSmartFileDefaultJudgmentActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        saveToCloud,
        setStatus,
        setShowObjectionRegistrationModal,
        setShowAbsentJudgmentNotificationModal,
        setShowOpponentAbsentObjectionModal,
        calendarUserId,
        lawsuitFileId,
        caseNo: resolveSmartFileParentCaseNo(parentData),
        court: resolveSmartFileParentCourt(parentData),
        parties: parentData?.parties,
        clientName: resolveSmartFileClientName(parentData),
    });

    const pleadingsActions = useSmartFilePleadingsActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
    });

    const handleShare = useCallback(() => {
        shareCaseReport(currentStage as Parameters<typeof shareCaseReport>[0]);
    }, [currentStage]);

    const judgmentActions = useSmartFileJudgmentActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        status,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
    });

    return {
        ...defaultJudgmentActions,
        ...pleadingsActions,
        ...judgmentActions,
        handleShare,
    };
}
