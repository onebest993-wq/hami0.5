import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, IncidentalCase, Task, TimelineEvent } from '../../LawyerShared';
import type { SmartFileChromeProps } from '../layout/SmartFileChrome';
import type { SmartFileMainPanelProps } from '../layout/SmartFileMainPanel';
import type { SmartFileModalsPortalProps } from '../layout/SmartFileModalsPortal';
import type { SmartFileParentData } from './parentDataInit';
import type { JudgmentPayload } from './judgmentTypes';

/** Flat scope from SmartFileModalContent — passed once into layout builders. */
export type SmartFileLayoutBuildInput = {
    onClose: () => void;
    file: Record<string, unknown>;
    status: string;
    isViewingArchived: boolean;
    isPaused: boolean;
    pauseReason: string;
    isInterrupted: boolean;
    interruptionData: Record<string, unknown> | null;
    linkedCaseNo: string;
    parentData: SmartFileParentData;
    displayStage: CaseStage;
    displayTimeline: TimelineEvent[];
    currentStage: CaseStage;
    stages: CaseStage[];
    activeStageIndex: number;
    viewingStageIndex: number;
    isPleadingsClosed: boolean | undefined;
    lastJudgmentType: string | undefined;
    isEditingStageName: boolean;
    setIsEditingStageName: (v: boolean) => void;
    tempStageName: string;
    setTempStageName: (v: string) => void;
    onSaveStageName: SmartFileChromeProps['onSaveStageName'];
    onShare: () => void;
    onStageSelect: (stageId: string) => void;
    onTouchStart: SmartFileMainPanelProps['onTouchStart'];
    onTouchMove: SmartFileMainPanelProps['onTouchMove'];
    onTouchEnd: SmartFileMainPanelProps['onTouchEnd'];
    stepperStages: unknown[];
    currentStageId: string;
    deletedEvents: TimelineEvent[];
    handlers: SmartFileModalsPortalProps['handlers'];
    handleResumeAbandonment: SmartFileMainPanelProps['handleResumeAbandonment'];
    handleResume: SmartFileMainPanelProps['handleResume'];
    handleToggleClient: SmartFileMainPanelProps['handleToggleClient'];
    handleInterruptionToggle: SmartFileMainPanelProps['handleInterruptionToggle'];
    handleAbandonment: SmartFileMainPanelProps['handleAbandonment'];
    handleToggleNotification: SmartFileMainPanelProps['handleToggleNotification'];
    handleCassationDecision: SmartFileMainPanelProps['handleCassationDecision'];
    handleClosePleadings: SmartFileMainPanelProps['handleClosePleadings'];
    handleReopenPleadings: SmartFileMainPanelProps['handleReopenPleadings'];
    handleDefaultObjection: SmartFileMainPanelProps['handleDefaultObjection'];
    handleWaiveObjection: SmartFileMainPanelProps['handleWaiveObjection'];
    handleOtherAppeals: SmartFileMainPanelProps['handleOtherAppeals'];
    handleExportPDF: SmartFileMainPanelProps['handleExportPDF'];
    handleResolveIncidentalCase: SmartFileMainPanelProps['handleResolveIncidentalCase'];
    handleQuickAction: SmartFileMainPanelProps['handleQuickAction'];
    handleToggleTask: SmartFileMainPanelProps['handleToggleTask'];
    handleDeleteEvent: SmartFileMainPanelProps['handleDeleteEvent'];
    handleEditEvent: SmartFileMainPanelProps['handleEditEvent'];
    handleCancelCrossAppeal: SmartFileMainPanelProps['handleCancelCrossAppeal'];
    handleAddCrossAppeal: SmartFileMainPanelProps['handleAddCrossAppeal'];
    setParentData: Dispatch<SetStateAction<SmartFileParentData>>;
    flags: {
        showExportMenu: boolean;
        setShowExportMenu: (v: boolean) => void;
        isTrashOpen: boolean;
        setIsTrashOpen: (v: boolean) => void;
        setShowEditInfoModal: (v: boolean) => void;
        isActionsMenuOpen: boolean;
        setIsActionsMenuOpen: (v: boolean) => void;
        showEditInfoModal: boolean;
        showTaskModal: boolean;
        setShowTaskModal: (v: boolean) => void;
        showDocModal: boolean;
        setShowDocModal: (v: boolean) => void;
        showNoteModal: boolean;
        setShowNoteModal: (v: boolean) => void;
        showPaymentModal: boolean;
        setShowPaymentModal: (v: boolean) => void;
        showIncidentalModal: boolean;
        setShowIncidentalModal: (v: boolean) => void;
        showFastTrackModal: boolean;
        setShowFastTrackModal: (v: boolean) => void;
        showAttachmentModal: boolean;
        setShowAttachmentModal: (v: boolean) => void;
        showActionModal: boolean;
        setShowActionModal: (v: boolean) => void;
        showApptModal: boolean;
        setShowApptModal: (v: boolean) => void;
        showPauseModal: boolean;
        setShowPauseModal: (v: boolean) => void;
        showInterruptionModal: boolean;
        setShowInterruptionModal: (v: boolean) => void;
        showResumeInterruptionModal: boolean;
        setShowResumeInterruptionModal: (v: boolean) => void;
        showInterlocutoryModal: boolean;
        setShowInterlocutoryModal: (v: boolean) => void;
        showObjectionRegistrationModal: boolean;
        setShowObjectionRegistrationModal: (v: boolean) => void;
        showObjectionJudgmentModal: boolean;
        setShowObjectionJudgmentModal: (v: boolean) => void;
        showJudgmentModal: boolean;
        setShowJudgmentModal: (v: boolean) => void;
        showAppealModal: boolean;
        setShowAppealModal: (v: boolean) => void;
        showAppealTransitionModal: boolean;
        setShowAppealTransitionModal: (v: boolean) => void;
        showCrossAppealModal: boolean;
        setShowCrossAppealModal: (v: boolean) => void;
        showProvisionalOrderModal: boolean;
        setShowProvisionalOrderModal: (v: boolean) => void;
        showNotificationModal: boolean;
        setShowNotificationModal: (v: boolean) => void;
        showExtraordinaryAppealModal: boolean | string;
        setShowExtraordinaryAppealModal: (v: boolean | string) => void;
        showMaterialErrorModal: string | null;
        setShowMaterialErrorModal: (v: string | null) => void;
        showJudgeRecusalModal: boolean;
        setShowJudgeRecusalModal: (v: boolean) => void;
        showTransferJurisdictionModal: boolean;
        setShowTransferJurisdictionModal: (v: boolean) => void;
        showCaseConsolidationModal: boolean;
        setShowCaseConsolidationModal: (v: boolean) => void;
        showAttorneyResignationModal: boolean;
        setShowAttorneyResignationModal: (v: boolean) => void;
        showExecutionTransferModal: boolean;
        setShowExecutionTransferModal: (v: boolean) => void;
        editingEvent: TimelineEvent | null;
        setEditingEvent: (e: TimelineEvent | null) => void;
        editingTask: Task | null;
        setEditingTask: (t: Task | null) => void;
        editingIncidental: IncidentalCase | null;
        setEditingIncidental: (c: IncidentalCase | null) => void;
        editingFastTrack: Record<string, unknown> | null;
        setEditingFastTrack: (v: Record<string, unknown> | null) => void;
        editingAttachment: Record<string, unknown> | null;
        setEditingAttachment: (v: Record<string, unknown> | null) => void;
        tempJudgmentData: JudgmentPayload | null;
        setTempJudgmentData: (v: JudgmentPayload | null) => void;
    };
};

export type SmartFileLayoutProps = {
    chrome: SmartFileChromeProps;
    mainPanel: SmartFileMainPanelProps;
    modalsPortal: SmartFileModalsPortalProps;
};

export function buildChromeProps(input: SmartFileLayoutBuildInput): SmartFileChromeProps {
    const { flags } = input;
    return {
        onClose: input.onClose,
        setShowEditInfoModal: flags.setShowEditInfoModal,
        showExportMenu: flags.showExportMenu,
        setShowExportMenu: flags.setShowExportMenu,
        onShare: input.onShare,
        isTrashOpen: flags.isTrashOpen,
        setIsTrashOpen: flags.setIsTrashOpen,
        isEditingStageName: input.isEditingStageName,
        setIsEditingStageName: input.setIsEditingStageName,
        tempStageName: input.tempStageName,
        setTempStageName: input.setTempStageName,
        onSaveStageName: input.onSaveStageName,
        stages: input.stages,
        viewingStageIndex: input.viewingStageIndex,
        activeStageIndex: input.activeStageIndex,
        isViewingArchived: input.isViewingArchived,
        onStageSelect: input.onStageSelect,
    };
}

export function buildMainPanelProps(input: SmartFileLayoutBuildInput): SmartFileMainPanelProps {
    const { flags } = input;
    return {
        file: input.file,
        status: input.status,
        isViewingArchived: input.isViewingArchived,
        isPaused: input.isPaused,
        pauseReason: input.pauseReason,
        isInterrupted: input.isInterrupted,
        interruptionData: input.interruptionData,
        linkedCaseNo: input.linkedCaseNo,
        parentData: input.parentData,
        displayStage: input.displayStage,
        displayTimeline: input.displayTimeline,
        currentStage: input.currentStage,
        stages: input.stages,
        activeStageIndex: input.activeStageIndex,
        viewingStageIndex: input.viewingStageIndex,
        isPleadingsClosed: input.isPleadingsClosed,
        lastJudgmentType: input.lastJudgmentType,
        onTouchStart: input.onTouchStart,
        onTouchMove: input.onTouchMove,
        onTouchEnd: input.onTouchEnd,
        handleResumeAbandonment: input.handleResumeAbandonment,
        handleResume: input.handleResume,
        handleToggleClient: input.handleToggleClient,
        handleStageSelect: input.onStageSelect,
        handleInterruptionToggle: input.handleInterruptionToggle,
        handleAbandonment: input.handleAbandonment,
        handleToggleNotification: input.handleToggleNotification,
        handleCassationDecision: input.handleCassationDecision,
        handleClosePleadings: input.handleClosePleadings,
        handleReopenPleadings: input.handleReopenPleadings,
        handleDefaultObjection: input.handleDefaultObjection,
        handleWaiveObjection: input.handleWaiveObjection,
        handleOtherAppeals: input.handleOtherAppeals,
        handleExportPDF: input.handleExportPDF,
        setShowMaterialErrorModal: flags.setShowMaterialErrorModal,
        setShowObjectionJudgmentModal: flags.setShowObjectionJudgmentModal,
        setShowAppealModal: flags.setShowAppealModal,
        setShowProvisionalOrderModal: flags.setShowProvisionalOrderModal,
        setShowExtraordinaryAppealModal: flags.setShowExtraordinaryAppealModal,
        setShowJudgeRecusalModal: flags.setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal: flags.setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal: flags.setShowCaseConsolidationModal,
        setShowAttorneyResignationModal: flags.setShowAttorneyResignationModal,
        setShowExecutionTransferModal: flags.setShowExecutionTransferModal,
        handleResolveIncidentalCase: input.handleResolveIncidentalCase,
        setShowIncidentalModal: flags.setShowIncidentalModal,
        setShowDocModal: flags.setShowDocModal,
        setShowApptModal: flags.setShowApptModal,
        setIsActionsMenuOpen: flags.setIsActionsMenuOpen,
        handleQuickAction: input.handleQuickAction,
        setShowPauseModal: flags.setShowPauseModal,
        setShowResumeInterruptionModal: flags.setShowResumeInterruptionModal,
        setShowNotificationModal: flags.setShowNotificationModal,
        setShowPaymentModal: flags.setShowPaymentModal,
        setParentData: input.setParentData,
        setShowTaskModal: flags.setShowTaskModal,
        handleToggleTask: input.handleToggleTask,
        setEditingTask: flags.setEditingTask,
        setEditingFastTrack: flags.setEditingFastTrack,
        setShowFastTrackModal: flags.setShowFastTrackModal,
        setEditingAttachment: flags.setEditingAttachment,
        setShowAttachmentModal: flags.setShowAttachmentModal,
        handleDeleteEvent: input.handleDeleteEvent,
        handleEditEvent: input.handleEditEvent,
        setShowCrossAppealModal: flags.setShowCrossAppealModal,
        setShowJudgmentModal: flags.setShowJudgmentModal,
        handleCancelCrossAppeal: input.handleCancelCrossAppeal,
        handleAddCrossAppeal: input.handleAddCrossAppeal,
        stepperStages: input.stepperStages,
        currentStageId: input.currentStageId,
    };
}

export function buildModalsPortalProps(input: SmartFileLayoutBuildInput): SmartFileModalsPortalProps {
    const { flags } = input;
    return {
        isViewingArchived: input.isViewingArchived,
        isActionsMenuOpen: flags.isActionsMenuOpen,
        setIsActionsMenuOpen: flags.setIsActionsMenuOpen,
        isPaused: input.isPaused,
        isInterrupted: input.isInterrupted,
        isTrashOpen: flags.isTrashOpen,
        setIsTrashOpen: flags.setIsTrashOpen,
        showEditInfoModal: flags.showEditInfoModal,
        setShowEditInfoModal: flags.setShowEditInfoModal,
        showTaskModal: flags.showTaskModal,
        setShowTaskModal: flags.setShowTaskModal,
        showDocModal: flags.showDocModal,
        setShowDocModal: flags.setShowDocModal,
        showNoteModal: flags.showNoteModal,
        setShowNoteModal: flags.setShowNoteModal,
        showPaymentModal: flags.showPaymentModal,
        setShowPaymentModal: flags.setShowPaymentModal,
        showIncidentalModal: flags.showIncidentalModal,
        setShowIncidentalModal: flags.setShowIncidentalModal,
        showFastTrackModal: flags.showFastTrackModal,
        setShowFastTrackModal: flags.setShowFastTrackModal,
        showAttachmentModal: flags.showAttachmentModal,
        setShowAttachmentModal: flags.setShowAttachmentModal,
        showActionModal: flags.showActionModal,
        setShowActionModal: flags.setShowActionModal,
        showApptModal: flags.showApptModal,
        setShowApptModal: flags.setShowApptModal,
        showPauseModal: flags.showPauseModal,
        setShowPauseModal: flags.setShowPauseModal,
        showInterruptionModal: flags.showInterruptionModal,
        setShowInterruptionModal: flags.setShowInterruptionModal,
        showResumeInterruptionModal: flags.showResumeInterruptionModal,
        setShowResumeInterruptionModal: flags.setShowResumeInterruptionModal,
        showInterlocutoryModal: flags.showInterlocutoryModal,
        setShowInterlocutoryModal: flags.setShowInterlocutoryModal,
        showObjectionRegistrationModal: flags.showObjectionRegistrationModal,
        setShowObjectionRegistrationModal: flags.setShowObjectionRegistrationModal,
        showObjectionJudgmentModal: flags.showObjectionJudgmentModal,
        setShowObjectionJudgmentModal: flags.setShowObjectionJudgmentModal,
        showJudgmentModal: flags.showJudgmentModal,
        setShowJudgmentModal: flags.setShowJudgmentModal,
        showAppealModal: flags.showAppealModal,
        setShowAppealModal: flags.setShowAppealModal,
        showAppealTransitionModal: flags.showAppealTransitionModal,
        setShowAppealTransitionModal: flags.setShowAppealTransitionModal,
        showCrossAppealModal: flags.showCrossAppealModal,
        setShowCrossAppealModal: flags.setShowCrossAppealModal,
        showProvisionalOrderModal: flags.showProvisionalOrderModal,
        setShowProvisionalOrderModal: flags.setShowProvisionalOrderModal,
        showNotificationModal: flags.showNotificationModal,
        setShowNotificationModal: flags.setShowNotificationModal,
        showExtraordinaryAppealModal: flags.showExtraordinaryAppealModal,
        setShowExtraordinaryAppealModal: flags.setShowExtraordinaryAppealModal,
        showMaterialErrorModal: flags.showMaterialErrorModal,
        setShowMaterialErrorModal: flags.setShowMaterialErrorModal,
        showJudgeRecusalModal: flags.showJudgeRecusalModal,
        setShowJudgeRecusalModal: flags.setShowJudgeRecusalModal,
        showTransferJurisdictionModal: flags.showTransferJurisdictionModal,
        setShowTransferJurisdictionModal: flags.setShowTransferJurisdictionModal,
        showCaseConsolidationModal: flags.showCaseConsolidationModal,
        setShowCaseConsolidationModal: flags.setShowCaseConsolidationModal,
        showAttorneyResignationModal: flags.showAttorneyResignationModal,
        setShowAttorneyResignationModal: flags.setShowAttorneyResignationModal,
        showExecutionTransferModal: flags.showExecutionTransferModal,
        setShowExecutionTransferModal: flags.setShowExecutionTransferModal,
        editingEvent: flags.editingEvent,
        setEditingEvent: flags.setEditingEvent,
        editingTask: flags.editingTask,
        setEditingTask: flags.setEditingTask,
        editingIncidental: flags.editingIncidental,
        setEditingIncidental: flags.setEditingIncidental,
        editingFastTrack: flags.editingFastTrack,
        setEditingFastTrack: flags.setEditingFastTrack,
        editingAttachment: flags.editingAttachment,
        setEditingAttachment: flags.setEditingAttachment,
        tempJudgmentData: flags.tempJudgmentData,
        setTempJudgmentData: flags.setTempJudgmentData,
        pauseReason: input.pauseReason,
        linkedCaseNo: input.linkedCaseNo,
        interruptionData: input.interruptionData,
        deletedEvents: input.deletedEvents,
        displayStage: input.displayStage,
        currentStage: input.currentStage,
        parentData: input.parentData,
        handlers: input.handlers,
    };
}

export function buildSmartFileLayoutProps(input: SmartFileLayoutBuildInput): SmartFileLayoutProps {
    return {
        chrome: buildChromeProps(input),
        mainPanel: buildMainPanelProps(input),
        modalsPortal: buildModalsPortalProps(input),
    };
}
