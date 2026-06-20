// @ts-nocheck
import type { FileData } from '../../LawyerShared';
import { resolveActiveStageName } from './caseConsolidationLinking';
import { buildSmartFileLayoutProps } from './viewProps';
import { buildSmartFileModalLayoutFlags } from './buildSmartFileModalLayoutFlags';
import type { buildSmartFileModalHandlers } from './buildSmartFileModalHandlers';
import type { useSmartFileModalFlags } from '../hooks/useSmartFileModalFlags';

type ModalFlags = ReturnType<typeof useSmartFileModalFlags>;
type ModalHandlers = ReturnType<typeof buildSmartFileModalHandlers>;

export type AssembleSmartFileModalLayoutParams = {
    onClose: () => void;
    file: FileData;
    status: string;
    isViewingArchived: boolean;
    isPaused: boolean;
    pauseReason: string;
    isInterrupted: boolean;
    interruptionData: unknown;
    linkedCaseNo: string;
    parentData: Record<string, unknown>;
    displayStage: Record<string, unknown> | undefined;
    displayTimeline: unknown[];
    currentStage: Record<string, unknown>;
    stages: unknown[];
    activeStageIndex: number;
    viewingStageIndex: number;
    isEditingStageName: boolean;
    setIsEditingStageName: (v: boolean) => void;
    tempStageName: string;
    setTempStageName: (v: string) => void;
    onSaveStageName: () => void;
    onShare: () => void;
    onStageSelect: (index: number) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    stepperStages: unknown[];
    currentStageId: string | number | undefined;
    deletedEvents: unknown[];
    modalHandlers: ModalHandlers;
    onOpenLinkedFile?: (fileId: number) => void;
    openFileIdentity: {
        fileId?: number;
        caseNo?: string;
        clientName?: string;
        court?: string;
    };
    consolidationCandidates: unknown[];
    onConsolidationCreateNew: () => void;
    onConsolidationMergeExisting: (...args: unknown[]) => void;
    onConsolidationExternalRef: (...args: unknown[]) => void;
    caseLinkCandidates: unknown[];
    onCaseLinkExisting: (...args: unknown[]) => void;
    onCaseLinkExternal: (...args: unknown[]) => void;
    handleCorrespondenceResponse: (...args: unknown[]) => void;
    handleResumeAbandonment: (...args: unknown[]) => void;
    handleResume: (...args: unknown[]) => void;
    handleToggleClient: (...args: unknown[]) => void;
    handleInterruptionToggle: (...args: unknown[]) => void;
    handleOpenPauseModal: () => void;
    handleAbandonment: (...args: unknown[]) => void;
    handleRegisterPetitionVoid: (...args: unknown[]) => void;
    handlePetitionVoidAppeal: (...args: unknown[]) => void;
    handlePetitionVoidOutcome: (...args: unknown[]) => void;
    handlePetitionVoidWaiver: (...args: unknown[]) => void;
    handleToggleNotification: (...args: unknown[]) => void;
    handleCassationDecision: (...args: unknown[]) => void;
    handleClosePleadings: (...args: unknown[]) => void;
    handleReopenPleadings: (...args: unknown[]) => void;
    handleOpenDefendantCassationAppeal: (...args: unknown[]) => void;
    handleDefaultObjection: (...args: unknown[]) => void;
    handleWaiveObjection: (...args: unknown[]) => void;
    handleOtherAppeals: (...args: unknown[]) => void;
    handleOpenAbsentJudgmentNotification: (...args: unknown[]) => void;
    handleOpenOpponentAbsentObjection: (...args: unknown[]) => void;
    handleExportPDF: (...args: unknown[]) => void;
    handleResolveIncidentalCase: (...args: unknown[]) => void;
    handleUpdateIncidentalEntryDecision: (...args: unknown[]) => void;
    handleQuickAction: (...args: unknown[]) => void;
    handleToggleTask: (...args: unknown[]) => void;
    handleAppealBriefFile: (...args: unknown[]) => void;
    handleAppealBriefOutcome: (...args: unknown[]) => void;
    handleDeleteEvent: (...args: unknown[]) => void;
    handleEditEvent: (...args: unknown[]) => void;
    handleAddAction: (...args: unknown[]) => void;
    handleSaveFastTrack: (...args: unknown[]) => void;
    handleCancelCrossAppeal: (...args: unknown[]) => void;
    handleAddCrossAppeal: (...args: unknown[]) => void;
    setParentData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
    modalFlags: ModalFlags;
};

export function assembleSmartFileModalLayout(params: AssembleSmartFileModalLayoutParams) {
    const isPleadingsClosed = params.displayStage?.isPleadingsClosed;
    const lastJudgmentType = params.displayStage?.lastJudgmentType || params.displayStage?.judgmentForm;

    return buildSmartFileLayoutProps({
        onClose: params.onClose,
        file: params.file,
        status: params.status,
        isViewingArchived: params.isViewingArchived,
        isPaused: params.isPaused,
        pauseReason: params.pauseReason,
        isInterrupted: params.isInterrupted,
        interruptionData: params.interruptionData,
        linkedCaseNo: params.linkedCaseNo,
        parentData: params.parentData,
        displayStage: params.displayStage,
        displayTimeline: params.displayTimeline,
        currentStage: params.currentStage,
        stages: params.stages,
        activeStageIndex: params.activeStageIndex,
        viewingStageIndex: params.viewingStageIndex,
        isPleadingsClosed,
        lastJudgmentType,
        isEditingStageName: params.isEditingStageName,
        setIsEditingStageName: params.setIsEditingStageName,
        tempStageName: params.tempStageName,
        setTempStageName: params.setTempStageName,
        onSaveStageName: params.onSaveStageName,
        onShare: params.onShare,
        onStageSelect: params.onStageSelect,
        onTouchStart: params.onTouchStart,
        onTouchMove: params.onTouchMove,
        onTouchEnd: params.onTouchEnd,
        stepperStages: params.stepperStages,
        currentStageId: params.currentStageId,
        deletedEvents: params.deletedEvents,
        handlers: params.modalHandlers,
        onOpenLinkedFile: params.onOpenLinkedFile,
        consolidationCurrentFileId: params.openFileIdentity.fileId ?? 0,
        consolidationCurrentCaseNo: params.openFileIdentity.caseNo,
        consolidationCurrentClientName: params.openFileIdentity.clientName,
        consolidationCurrentCourt: params.openFileIdentity.court,
        consolidationCurrentStageLabel:
            resolveActiveStageName(params.file) ||
            String(params.currentStage?.stageName ?? params.displayStage?.stageName ?? '').trim(),
        consolidationCandidates: params.consolidationCandidates,
        onConsolidationCreateNew: params.onConsolidationCreateNew,
        onConsolidationMergeExisting: params.onConsolidationMergeExisting,
        onConsolidationExternalRef: params.onConsolidationExternalRef,
        caseLinkCurrentFileId: params.openFileIdentity.fileId ?? 0,
        caseLinkCurrentCaseNo: params.openFileIdentity.caseNo,
        caseLinkCandidates: params.caseLinkCandidates,
        onCaseLinkExisting: params.onCaseLinkExisting,
        onCaseLinkExternal: params.onCaseLinkExternal,
        handleCorrespondenceResponse: params.handleCorrespondenceResponse,
        handleResumeAbandonment: params.handleResumeAbandonment,
        handleResume: params.handleResume,
        handleToggleClient: params.handleToggleClient,
        handleInterruptionToggle: params.handleInterruptionToggle,
        handleOpenPauseModal: params.handleOpenPauseModal,
        handleAbandonment: params.handleAbandonment,
        handleRegisterPetitionVoid: params.handleRegisterPetitionVoid,
        handlePetitionVoidAppeal: params.handlePetitionVoidAppeal,
        handlePetitionVoidOutcome: params.handlePetitionVoidOutcome,
        handlePetitionVoidWaiver: params.handlePetitionVoidWaiver,
        handleToggleNotification: params.handleToggleNotification,
        handleCassationDecision: params.handleCassationDecision,
        handleClosePleadings: params.handleClosePleadings,
        handleReopenPleadings: params.handleReopenPleadings,
        handleOpenDefendantCassationAppeal: params.handleOpenDefendantCassationAppeal,
        handleDefaultObjection: params.handleDefaultObjection,
        handleWaiveObjection: params.handleWaiveObjection,
        handleOtherAppeals: params.handleOtherAppeals,
        handleOpenAbsentJudgmentNotification: params.handleOpenAbsentJudgmentNotification,
        handleOpenOpponentAbsentObjection: params.handleOpenOpponentAbsentObjection,
        handleExportPDF: params.handleExportPDF,
        handleResolveIncidentalCase: params.handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision: params.handleUpdateIncidentalEntryDecision,
        handleQuickAction: params.handleQuickAction,
        handleToggleTask: params.handleToggleTask,
        handleAppealBriefFile: params.handleAppealBriefFile,
        handleAppealBriefOutcome: params.handleAppealBriefOutcome,
        handleDeleteEvent: params.handleDeleteEvent,
        handleEditEvent: params.handleEditEvent,
        handleAddAction: params.handleAddAction,
        handleSaveFastTrack: params.handleSaveFastTrack,
        handleCancelCrossAppeal: params.handleCancelCrossAppeal,
        handleAddCrossAppeal: params.handleAddCrossAppeal,
        setParentData: params.setParentData,
        flags: buildSmartFileModalLayoutFlags(params.modalFlags),
    });
}
