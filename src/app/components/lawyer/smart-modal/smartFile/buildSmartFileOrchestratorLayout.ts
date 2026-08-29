import type { FileData } from '../../LawyerShared';
import type { Dispatch, SetStateAction } from 'react';
import { assembleSmartFileModalLayout } from './assembleSmartFileModalLayout';
import type { useSmartFileModalCaseStatus } from '../hooks/useSmartFileModalCaseStatus';
import type { useSmartFileModalDomainActions } from '../hooks/useSmartFileModalDomainActions';
import type { useSmartFileModalFlags } from '../hooks/useSmartFileModalFlags';
import type { useSmartFileStageNavigation } from '../hooks/useSmartFileStageNavigation';
import type { SmartFileModalProps } from './smartFileModalTypes';

type StageNavigation = ReturnType<typeof useSmartFileStageNavigation>;
type CaseStatus = ReturnType<typeof useSmartFileModalCaseStatus>;
type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;
type DomainActions = ReturnType<typeof useSmartFileModalDomainActions>;

type BuildSmartFileOrchestratorLayoutInput = {
    onClose: SmartFileModalProps['onClose'];
    file: FileData;
    onOpenLinkedFile?: SmartFileModalProps['onOpenLinkedFile'];
    lawsuitFiles?: SmartFileModalProps['lawsuitFiles'];
    parentData: Record<string, unknown>;
    setParentData: Dispatch<SetStateAction<Record<string, unknown>>>;
    navigation: StageNavigation;
    caseStatus: CaseStatus;
    modalFlags: ModalFlags;
    actions: DomainActions;
    isEditingStageName: boolean;
    setIsEditingStageName: (v: boolean) => void;
    tempStageName: string;
    setTempStageName: (v: string) => void;
};

export function buildSmartFileOrchestratorLayout(input: BuildSmartFileOrchestratorLayoutInput) {
    const {
        onClose,
        file,
        onOpenLinkedFile,
        lawsuitFiles,
        parentData,
        setParentData,
        navigation,
        caseStatus,
        modalFlags,
        actions,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        setTempStageName,
    } = input;

    return assembleSmartFileModalLayout({
        onClose,
        file,
        status: caseStatus.status,
        isViewingArchived: navigation.isViewingArchived,
        isPaused: caseStatus.isPaused,
        pauseReason: caseStatus.pauseReason,
        isInterrupted: caseStatus.isInterrupted,
        interruptionData: caseStatus.interruptionData,
        linkedCaseNo: caseStatus.linkedCaseNo,
        parentData,
        displayStage: navigation.displayStage,
        displayTimeline: navigation.displayTimeline,
        currentStage: navigation.currentStage,
        stages: navigation.stages,
        activeStageIndex: navigation.activeStageIndex,
        viewingStageIndex: navigation.viewingStageIndex,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        setTempStageName,
        onSaveStageName: actions.handleSaveStageName,
        onShare: actions.handleShare,
        onStageSelect: actions.handleStageSelect,
        onTouchStart: navigation.onTouchStart,
        onTouchMove: navigation.onTouchMove,
        onTouchEnd: navigation.onTouchEnd,
        stepperStages: navigation.stepperStages,
        currentStageId: navigation.currentStageId,
        deletedEvents: navigation.deletedEvents,
        modalHandlers: actions.modalHandlers,
        onOpenLinkedFile,
        lawsuitFiles,
        openFileIdentity: actions.openFileIdentity,
        consolidationCandidates: actions.consolidationCandidates,
        onConsolidationCreateNew: actions.handleConsolidationCreateNew,
        onConsolidationMergeExisting: actions.handleConsolidationMergeExisting,
        onConsolidationExternalRef: actions.handleConsolidationExternalRef,
        caseLinkCandidates: actions.caseLinkCandidates,
        onCaseLinkExisting: actions.handleCaseLinkExisting,
        onCaseLinkExternal: actions.handleCaseLinkExternal,
        handleCorrespondenceResponse: actions.handleCorrespondenceResponse,
        handleResumeAbandonment: actions.handleResumeAbandonment,
        handleResume: actions.handleResume,
        handleInterruptionToggle: actions.handleInterruptionToggle,
        handleOpenPauseModal: actions.handleOpenPauseModal,
        handleOpenPauseResume: actions.handleOpenPauseResume,
        handleAbandonment: actions.handleAbandonment,
        handleRegisterPetitionVoid: actions.handleRegisterPetitionVoid,
        handlePetitionVoidAppeal: actions.handlePetitionVoidAppeal,
        handlePetitionVoidOutcome: actions.handlePetitionVoidOutcome,
        handlePetitionVoidWaiver: actions.handlePetitionVoidWaiver,
        handleToggleNotification: actions.handleToggleNotification,
        handleCassationDecision: actions.handleCassationDecision,
        handleClosePleadings: actions.handleClosePleadings,
        handleReopenPleadings: actions.handleReopenPleadings,
        handleOpenDefendantCassationAppeal: actions.handleOpenDefendantCassationAppeal,
        handleDefaultObjection: actions.handleDefaultObjection,
        handleWaiveObjection: actions.handleWaiveObjection,
        handleOpponentAppealWaived: actions.handleOpponentAppealWaived,
        handleOtherAppeals: actions.handleOtherAppeals,
        handleOpenAbsentJudgmentNotification: actions.handleOpenAbsentJudgmentNotification,
        handleOpenOpponentAbsentObjection: actions.handleOpenOpponentAbsentObjection,
        handleExportPDF: actions.handleExportPDF,
        handleResolveIncidentalCase: actions.handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision: actions.handleUpdateIncidentalEntryDecision,
        handleQuickAction: actions.handleQuickAction,
        handleToggleTask: actions.handleToggleTask,
        handleAppealBriefFile: actions.handleAppealBriefFile,
        handleAppealBriefOutcome: actions.handleAppealBriefOutcome,
        handleDeleteEvent: actions.handleDeleteEvent,
        handleEditEvent: actions.handleEditEvent,
        handleAddAction: actions.handleAddAction,
        handleSaveFastTrack: actions.handleSaveFastTrack,
        handleCancelCrossAppeal: actions.handleCancelCrossAppeal,
        handleAddCrossAppeal: actions.handleAddCrossAppeal,
        setParentData,
        modalFlags,
    });
}
