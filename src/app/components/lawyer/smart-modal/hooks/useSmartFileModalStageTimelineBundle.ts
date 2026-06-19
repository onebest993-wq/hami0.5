import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { useSmartFileStageActions } from './useSmartFileStageActions';
import { useSmartFileTimelineActions } from './useSmartFileTimelineActions';
import type { useSmartFileModalFlags } from './useSmartFileModalFlags';

type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;

export type SmartFileModalStageTimelineBundleParams = {
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    setActiveStageIndex: Dispatch<SetStateAction<number>>;
    setViewingStageIndex: Dispatch<SetStateAction<number>>;
    currentStage: CaseStage | undefined;
    displayStage: CaseStage | undefined;
    parentData: Record<string, unknown>;
    setParentData: Dispatch<SetStateAction<Record<string, unknown>>>;
    saveToCloud: () => void;
    isEditingStageName: boolean;
    setIsEditingStageName: Dispatch<SetStateAction<boolean>>;
    tempStageName: string;
    onCalendarUnlink?: (params: { sourceEventId: string; eventType?: TimelineEvent['type'] }) => void;
    modalFlags: ModalFlags;
};

export function useSmartFileModalStageTimelineBundle({
    stages,
    setStages,
    activeStageIndex,
    setActiveStageIndex,
    setViewingStageIndex,
    currentStage,
    displayStage,
    parentData,
    setParentData,
    saveToCloud,
    isEditingStageName,
    setIsEditingStageName,
    tempStageName,
    onCalendarUnlink,
    modalFlags,
}: SmartFileModalStageTimelineBundleParams) {
    const {
        setShowApptModal,
        setShowNoteModal,
        setShowDocModal,
        setShowIncidentalModal,
        setShowInterlocutoryModal,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setEditingEvent,
        setIsTrashOpen,
    } = modalFlags;

    const stageActions = useSmartFileStageActions({
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        displayStage,
        parentData,
        setParentData,
        saveToCloud,
        modalSetters: {
            setShowApptModal,
            setShowNoteModal,
            setShowDocModal,
            setShowIncidentalModal,
            setShowInterlocutoryModal,
            setShowFastTrackModal,
            setShowAttachmentModal,
        },
        setIsEditingStageName,
        tempStageName,
    });

    const timelineActions = useSmartFileTimelineActions({
        stages,
        setStages,
        activeStageIndex,
        currentStage,
        saveToCloud,
        setEditingEvent,
        setIsTrashOpen,
        onCalendarUnlink,
    });

    return { ...stageActions, ...timelineActions };
}
