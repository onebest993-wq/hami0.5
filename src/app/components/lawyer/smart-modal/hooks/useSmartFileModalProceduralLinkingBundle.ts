// @ts-nocheck
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { useSmartFileProceduralActions } from './useSmartFileProceduralActions';
import { useSmartFileIncidentalSpawn } from './useSmartFileIncidentalSpawn';
import { useSmartFileConsolidationLinking } from './useSmartFileConsolidationLinking';
import { buildSmartFileModalHandlers } from '../smartFile/buildSmartFileModalHandlers';
import type { useSmartFileModalFlags } from './useSmartFileModalFlags';
import type { SmartFileModalProps } from '../smartFile/smartFileModalTypes';

type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;

export type SmartFileModalProceduralLinkingBundleParams = {
    file: SmartFileModalProps['file'];
    lawsuitFiles: SmartFileModalProps['lawsuitFiles'];
    onSpawnLinkedIncidentalCase: SmartFileModalProps['onSpawnLinkedIncidentalCase'];
    onLinkWithExistingCase: SmartFileModalProps['onLinkWithExistingCase'];
    onStartConsolidationNewCase: SmartFileModalProps['onStartConsolidationNewCase'];
    onConsolidateWithExisting: SmartFileModalProps['onConsolidateWithExisting'];
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    viewingStageIndex: number;
    currentStage: CaseStage | undefined;
    parentData: Record<string, unknown>;
    setParentData: Dispatch<SetStateAction<Record<string, unknown>>>;
    saveToCloud: () => void;
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
    status: string;
    calendarUserId: string | undefined;
    modalFlags: ModalFlags;
    handleUpdateCaseInfo: (...args: unknown[]) => void;
    handleQuickAction: (...args: unknown[]) => void;
    handleRegisterObjection: (...args: unknown[]) => void;
    handleObjectionJudgment: (...args: unknown[]) => void;
    handleAbsentJudgmentNotification: (...args: unknown[]) => void;
    handleOpponentAbsentObjection: (...args: unknown[]) => void;
    handleRestoreEvent: (...args: unknown[]) => void;
    handleHardDeleteEvent: (...args: unknown[]) => void;
    handleDeleteEvent: (...args: unknown[]) => void;
    handleEmptyTrash: (...args: unknown[]) => void;
    handleJudgmentConfirm: (...args: unknown[]) => void;
    handleAppealRegistration: (...args: unknown[]) => void;
    handleAppealTransition: (...args: unknown[]) => void;
    handleCrossAppeal: (...args: unknown[]) => void;
    handleSaveNotification: (...args: unknown[]) => void;
};

export function useSmartFileModalProceduralLinkingBundle({
    file,
    lawsuitFiles,
    onSpawnLinkedIncidentalCase,
    onLinkWithExistingCase,
    onStartConsolidationNewCase,
    onConsolidateWithExisting,
    stages,
    setStages,
    activeStageIndex,
    viewingStageIndex,
    currentStage,
    parentData,
    setParentData,
    saveToCloud,
    setStatus,
    isPaused,
    setIsPaused,
    pauseReason,
    setPauseReason,
    linkedCaseNo,
    setLinkedCaseNo,
    isInterrupted,
    setIsInterrupted,
    interruptionData,
    setInterruptionData,
    status,
    calendarUserId,
    modalFlags,
    handleUpdateCaseInfo,
    handleQuickAction,
    handleRegisterObjection,
    handleObjectionJudgment,
    handleAbsentJudgmentNotification,
    handleOpponentAbsentObjection,
    handleRestoreEvent,
    handleHardDeleteEvent,
    handleDeleteEvent,
    handleEmptyTrash,
    handleJudgmentConfirm,
    handleAppealRegistration,
    handleAppealTransition,
    handleCrossAppeal,
    handleSaveNotification,
}: SmartFileModalProceduralLinkingBundleParams) {
    const {
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowCaseLinkModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        setShowIncidentalModal,
        setAppealOutcomeTask,
    } = modalFlags;

    const proceduralActions = useSmartFileProceduralActions({
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setIsInterrupted,
        setInterruptionData,
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId,
        setAppealOutcomeTask,
    });

    const handleSpawnLinkedIncidentalCase = useSmartFileIncidentalSpawn({
        fileId: file.id,
        fileCaseNo: file.caseNo,
        currentStageCaseNo: currentStage?.caseNo,
        handleAddIncidentalCase: proceduralActions.handleAddIncidentalCase,
        onSpawnLinkedIncidentalCase,
        setShowIncidentalModal,
        setEditingIncidental,
    });

    const linkingActions = useSmartFileConsolidationLinking({
        file,
        parentData,
        lawsuitFiles,
        onLinkWithExistingCase,
        onStartConsolidationNewCase,
        onConsolidateWithExisting,
        setShowCaseLinkModal,
        setShowCaseConsolidationModal,
    });

    const modalHandlers = buildSmartFileModalHandlers({
        handleUpdateCaseInfo,
        handleAddTask: proceduralActions.handleAddTask,
        handleAddDoc: proceduralActions.handleAddDoc,
        handleAddNote: proceduralActions.handleAddNote,
        handleAddPayment: proceduralActions.handleAddPayment,
        handleAddIncidentalCase: proceduralActions.handleAddIncidentalCase,
        handleSpawnLinkedIncidentalCase,
        handleSaveFastTrack: proceduralActions.handleSaveFastTrack,
        handleSaveAttachment: proceduralActions.handleSaveAttachment,
        handleAddAction: proceduralActions.handleAddAction,
        handleAddAppointment: proceduralActions.handleAddAppointment,
        handlePauseConfirm: proceduralActions.handlePauseConfirm,
        handleInterruptionConfirm: proceduralActions.handleInterruptionConfirm,
        handleResumeInterruptionConfirm: proceduralActions.handleResumeInterruptionConfirm,
        handleInterlocutoryAppealConfirm: proceduralActions.handleInterlocutoryAppealConfirm,
        handleRegisterObjection,
        handleObjectionJudgment,
        handleAbsentJudgmentNotification,
        handleOpponentAbsentObjection,
        handleRestoreEvent,
        handleHardDeleteEvent,
        handleDeleteEvent,
        handleEmptyTrash,
        handleJudgmentConfirm,
        handleAppealRegistration,
        handleAppealTransition,
        handleCrossAppeal,
        handleProvisionalOrderConfirm: proceduralActions.handleProvisionalOrderConfirm,
        handleSaveNotification,
        handleExtraordinaryAppeal: proceduralActions.handleExtraordinaryAppeal,
        handleMaterialErrorCorrection: proceduralActions.handleMaterialErrorCorrection,
        handleJudgeRecusal: proceduralActions.handleJudgeRecusal,
        handleTransferJurisdiction: proceduralActions.handleTransferJurisdiction,
        handleCaseConsolidation: proceduralActions.handleCaseConsolidation,
        handleCaseLinkExternal: proceduralActions.handleCaseLinkExternal,
        handleCorrespondence: proceduralActions.handleCorrespondence,
        handleQuickAction,
        handleAbandonment: proceduralActions.handleAbandonment,
        handleInterruptionToggle: proceduralActions.handleInterruptionToggle,
        handleResume: proceduralActions.handleResume,
        handleAppealBriefOutcome: proceduralActions.handleAppealBriefOutcome,
    });

    const handleOpenPauseModal = useCallback(() => setShowPauseModal(true), [setShowPauseModal]);

    return {
        ...proceduralActions,
        handleSpawnLinkedIncidentalCase,
        ...linkingActions,
        modalHandlers,
        handleOpenPauseModal,
    };
}
