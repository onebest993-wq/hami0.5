// @ts-nocheck
import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { useSmartFileModalStageTimelineBundle } from './useSmartFileModalStageTimelineBundle';
import { useSmartFileModalJudgmentBundle } from './useSmartFileModalJudgmentBundle';
import { useSmartFileModalProceduralLinkingBundle } from './useSmartFileModalProceduralLinkingBundle';
import type { useSmartFileModalFlags } from './useSmartFileModalFlags';
import type { SmartFileModalProps } from '../smartFile/smartFileModalTypes';

type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;

export type SmartFileModalDomainActionsParams = {
    file: SmartFileModalProps['file'];
    lawsuitFiles: SmartFileModalProps['lawsuitFiles'];
    onSpawnLinkedIncidentalCase: SmartFileModalProps['onSpawnLinkedIncidentalCase'];
    onLinkWithExistingCase: SmartFileModalProps['onLinkWithExistingCase'];
    onStartConsolidationNewCase: SmartFileModalProps['onStartConsolidationNewCase'];
    onConsolidateWithExisting: SmartFileModalProps['onConsolidateWithExisting'];
    parentData: Record<string, unknown>;
    setParentData: Dispatch<SetStateAction<Record<string, unknown>>>;
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: Dispatch<SetStateAction<number>>;
    viewingStageIndex: number;
    setViewingStageIndex: Dispatch<SetStateAction<number>>;
    currentStage: CaseStage | undefined;
    displayStage: CaseStage | undefined;
    status: string;
    setStatus: Dispatch<SetStateAction<string>>;
    isPaused: boolean;
    setIsPaused: Dispatch<SetStateAction<boolean>>;
    pauseReason: string;
    setPauseReason: Dispatch<SetStateAction<string>>;
    linkedCaseNo: string;
    setLinkedCaseNo: Dispatch<SetStateAction<string>>;
    isInterrupted: boolean;
    setIsInterrupted: Dispatch<SetStateAction<boolean>>;
    interruptionData: unknown;
    setInterruptionData: Dispatch<SetStateAction<unknown>>;
    isEditingStageName: boolean;
    setIsEditingStageName: Dispatch<SetStateAction<boolean>>;
    tempStageName: string;
    saveToCloud: () => void;
    calendarUserId: string | undefined;
    lawsuitFileId: string | undefined;
    onCalendarUnlink?: (params: { sourceEventId: string; eventType?: TimelineEvent['type'] }) => void;
    modalFlags: ModalFlags;
};

export function useSmartFileModalDomainActions(params: SmartFileModalDomainActionsParams) {
    const stageTimeline = useSmartFileModalStageTimelineBundle(params);

    const judgment = useSmartFileModalJudgmentBundle(params);

    const proceduralLinking = useSmartFileModalProceduralLinkingBundle({
        ...params,
        handleUpdateCaseInfo: stageTimeline.handleUpdateCaseInfo,
        handleQuickAction: stageTimeline.handleQuickAction,
        handleRegisterObjection: judgment.handleRegisterObjection,
        handleObjectionJudgment: judgment.handleObjectionJudgment,
        handleAbsentJudgmentNotification: judgment.handleAbsentJudgmentNotification,
        handleOpponentAbsentObjection: judgment.handleOpponentAbsentObjection,
        handleRestoreEvent: stageTimeline.handleRestoreEvent,
        handleHardDeleteEvent: stageTimeline.handleHardDeleteEvent,
        handleDeleteEvent: stageTimeline.handleDeleteEvent,
        handleEmptyTrash: stageTimeline.handleEmptyTrash,
        handleJudgmentConfirm: judgment.handleJudgmentConfirm,
        handleAppealRegistration: judgment.handleAppealRegistration,
        handleAppealTransition: judgment.handleAppealTransition,
        handleCrossAppeal: judgment.handleCrossAppeal,
        handleSaveNotification: stageTimeline.handleSaveNotification,
    });

    return {
        ...stageTimeline,
        ...judgment,
        ...proceduralLinking,
    };
}
