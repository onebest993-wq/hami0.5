import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, IncidentalCase, Task, TimelineEvent } from '../../LawyerShared';
import type { SmartFileChromeProps } from '../layout/SmartFileChrome';
import type { SmartFileMainPanelProps } from '../layout/SmartFileMainPanel';
import type { SmartFileModalsPortalProps } from '../layout/SmartFileModalsPortal';
import type { SmartFileParentData } from './parentDataInit';
import {
    findFirstInstanceBasisStage,
    pickQuantifiedClaimValue,
    readPersistedClaimValue,
    resolveAppealRouteContext,
} from './appealRouteEligibility';
import { readFileDetailsField } from '../layout/mainPanel/smartFileMainPanelUtils';
import type { ConsolidationCandidate } from './caseConsolidationLinking';
import type { JudgmentPayload } from './judgmentTypes';
import { shouldShowPetitionVoidFooterPanel } from './petitionVoidFlow';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { SmartFileModalVisualVariant } from './smartFileModalTheme';

function resolveAppealRouteForDossier(input: SmartFileLayoutBuildInput) {
    const fileRecord = input.file as Record<string, unknown>;
    const file = input.file as Parameters<typeof resolveAppealRouteContext>[0];
    const liveStages = Array.isArray(input.stages) ? input.stages : [];
    if (!input.currentStage) {
        return resolveAppealRouteContext(file, null);
    }
    const basisStage =
        findFirstInstanceBasisStage(liveStages, input.currentStage) ?? input.currentStage;
    const stageClaimValues = liveStages.map((stage) => stage?.claimValue);
    const persistedClaim = pickQuantifiedClaimValue(
        basisStage?.claimValue,
        readPersistedClaimValue(file),
        readFileDetailsField(fileRecord, 'claimValue'),
        input.currentStage?.claimValue,
        input.displayStage?.claimValue,
        ...stageClaimValues,
    );

    return resolveAppealRouteContext(
        {
            ...file,
            stages: liveStages,
            claimValue: persistedClaim,
            activeStage: input.currentStage,
            docType:
                input.parentData?.docType ||
                input.currentStage?.docType ||
                input.displayStage?.docType ||
                file?.docType,
            type:
                input.currentStage?.type ||
                input.displayStage?.type ||
                file?.type,
            currentStage:
                input.currentStage?.stageName ??
                (typeof file?.currentStage === 'string' ? file.currentStage : undefined),
        },
        {
            ...basisStage,
            stageName:
                String(basisStage?.stageName ?? basisStage?.name ?? '').trim() ||
                input.currentStage?.stageName,
            claimValue: persistedClaim,
            docType:
                basisStage?.docType ||
                input.currentStage?.docType ||
                input.displayStage?.docType ||
                input.parentData?.docType,
            type: basisStage?.type || input.currentStage?.type || input.displayStage?.type,
        },
    );
}

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
    handlers: Record<string, (...args: unknown[]) => void>;
    onOpenLinkedFile?: (fileId: number) => void;
    lawsuitFiles?: import('../../LawyerShared').FileData[];
    consolidationCurrentFileId: number;
    consolidationCurrentCaseNo: string;
    consolidationCurrentClientName?: string;
    consolidationCurrentCourt?: string;
    consolidationCurrentStageLabel?: string;
    consolidationCandidates: ConsolidationCandidate[];
    onConsolidationCreateNew?: (data: { consolidationDate: string; notes?: string }) => void;
    onConsolidationMergeExisting?: (data: {
        secondaryFileId: number;
        consolidationDate: string;
        notes?: string;
    }) => void;
    onConsolidationExternalRef?: (data: {
        peerCaseNo: string;
        consolidationDate: string;
        notes?: string;
    }) => void;
    caseLinkCurrentFileId: number;
    caseLinkCurrentCaseNo: string;
    caseLinkCandidates: ConsolidationCandidate[];
    onCaseLinkExisting?: (data: {
        secondaryFileId: number;
        linkDate: string;
        reason?: string;
    }) => void;
    onCaseLinkExternal?: (data: { peerCaseNo: string; linkDate: string; reason?: string }) => void;
    handleCorrespondenceResponse?: SmartFileMainPanelProps['handleCorrespondenceResponse'];
    handleResumeAbandonment: SmartFileMainPanelProps['handleResumeAbandonment'];
    handleResume: SmartFileMainPanelProps['handleResume'];
    handleToggleClient: SmartFileMainPanelProps['handleToggleClient'];
    handleInterruptionToggle: SmartFileMainPanelProps['handleInterruptionToggle'];
    handleOpenPauseModal: () => void;
    handleOpenPauseResume: () => void;
    handleAbandonment: SmartFileMainPanelProps['handleAbandonment'];
    handleRegisterPetitionVoid: () => void;
    handlePetitionVoidAppeal: SmartFileMainPanelProps['handlePetitionVoidAppeal'];
    handlePetitionVoidOutcome: SmartFileMainPanelProps['handlePetitionVoidOutcome'];
    handlePetitionVoidWaiver: () => void;
    handleToggleNotification: SmartFileMainPanelProps['handleToggleNotification'];
    handleCassationDecision: SmartFileMainPanelProps['handleCassationDecision'];
    handleClosePleadings: SmartFileMainPanelProps['handleClosePleadings'];
    handleReopenPleadings: SmartFileMainPanelProps['handleReopenPleadings'];
    handleOpenDefendantCassationAppeal: () => void;
    handleDefaultObjection: SmartFileMainPanelProps['handleDefaultObjection'];
    handleWaiveObjection: SmartFileMainPanelProps['handleWaiveObjection'];
    handleOpponentAppealWaived: SmartFileMainPanelProps['handleOpponentAppealWaived'];
    handleOpponentAppealWaived: SmartFileMainPanelProps['handleOpponentAppealWaived'];
    handleOtherAppeals: SmartFileMainPanelProps['handleOtherAppeals'];
    handleOpenAbsentJudgmentNotification: () => void;
    handleOpenOpponentAbsentObjection: () => void;
    handleExportPDF: SmartFileMainPanelProps['handleExportPDF'];
    handleResolveIncidentalCase: SmartFileMainPanelProps['handleResolveIncidentalCase'];
    handleUpdateIncidentalEntryDecision?: SmartFileMainPanelProps['handleUpdateIncidentalEntryDecision'];
    handleQuickAction: SmartFileMainPanelProps['handleQuickAction'];
    handleToggleTask: SmartFileMainPanelProps['handleToggleTask'];
    handleAppealBriefFile?: SmartFileMainPanelProps['handleAppealBriefFile'];
    handleAppealBriefOutcome?: SmartFileMainPanelProps['handleAppealBriefOutcome'];
    handleDeleteEvent: SmartFileMainPanelProps['handleDeleteEvent'];
    handleEditEvent: SmartFileMainPanelProps['handleEditEvent'];
    handleAddAction: SmartFileMainPanelProps['handleAddAction'];
    handleSaveFastTrack: SmartFileMainPanelProps['handleSaveFastTrack'];
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
        showApptModal: boolean;
        setShowApptModal: (v: boolean) => void;
        showPauseModal: boolean;
        setShowPauseModal: (v: boolean) => void;
        showInterruptionModal: boolean;
        setShowInterruptionModal: (v: boolean) => void;
        showResumeInterruptionModal: boolean;
        setShowResumeInterruptionModal: (v: boolean) => void;
        showAbandonmentRenewalModal: boolean;
        setShowAbandonmentRenewalModal: (v: boolean) => void;
        showPauseResumeModal: boolean;
        setShowPauseResumeModal: (v: boolean) => void;
        showInterlocutoryModal: boolean;
        setShowInterlocutoryModal: (v: boolean) => void;
        showObjectionRegistrationModal: boolean;
        setShowObjectionRegistrationModal: (v: boolean) => void;
        showObjectionJudgmentModal: boolean;
        setShowObjectionJudgmentModal: (v: boolean) => void;
        showAbsentJudgmentNotificationModal: boolean;
        setShowAbsentJudgmentNotificationModal: (v: boolean) => void;
        showOpponentAbsentObjectionModal: boolean;
        setShowOpponentAbsentObjectionModal: (v: boolean) => void;
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
        showCaseLinkModal: boolean;
        setShowCaseLinkModal: (v: boolean) => void;
        showCorrespondenceModal: boolean;
        setShowCorrespondenceModal: (v: boolean) => void;
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
        appealOutcomeTask: Task | null;
        setAppealOutcomeTask: (t: Task | null) => void;
    };
};

export type SmartFileLayoutProps = {
    chrome: SmartFileChromeProps;
    mainPanel: SmartFileMainPanelProps;
    modalsPortal: SmartFileModalsPortalProps;
};

export function buildChromeProps(input: SmartFileLayoutBuildInput): SmartFileChromeProps {
    const { flags } = input;
    const editable = !input.isViewingArchived;
    const isPersonalDossier = isPersonalStatusFile(input.file);
    return {
        onClose: input.onClose,
        setShowEditInfoModal: flags.setShowEditInfoModal,
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
        onInterrupt: editable ? input.handleInterruptionToggle : undefined,
        onPause: editable ? input.handleOpenPauseModal : undefined,
        onResume: editable ? input.handleOpenPauseResume : undefined,
        onAbandon: editable ? input.handleAbandonment : undefined,
        onPetitionVoid: editable ? input.handleRegisterPetitionVoid : undefined,
        flowStage: input.displayStage,
        isPaused: input.isPaused,
        isInterrupted: input.isInterrupted,
        hideCaseFlowActions:
            isPersonalDossier
            || shouldShowPetitionVoidFooterPanel(input.displayStage)
            || (Boolean(input.displayStage?.isPleadingsClosed) && !input.displayStage?.petitionVoidFlow),
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
        handlePetitionVoidAppeal: input.handlePetitionVoidAppeal,
        handlePetitionVoidOutcome: input.handlePetitionVoidOutcome,
        handleToggleNotification: input.handleToggleNotification,
        handleCassationDecision: input.handleCassationDecision,
        handleClosePleadings: input.handleClosePleadings,
        handleReopenPleadings: input.handleReopenPleadings,
        handleOpenDefendantCassationAppeal: input.handleOpenDefendantCassationAppeal,
        handleDefaultObjection: input.handleDefaultObjection,
        handleWaiveObjection: input.handleWaiveObjection,
        handleOpponentAppealWaived: input.handleOpponentAppealWaived,
        handleOtherAppeals: input.handleOtherAppeals,
        onAbsentJudgmentNotification: input.handleOpenAbsentJudgmentNotification,
        onOpponentAbsentObjection: input.handleOpenOpponentAbsentObjection,
        handleExportPDF: input.handleExportPDF,
        setShowAppealModal: flags.setShowAppealModal,
        setShowProvisionalOrderModal: flags.setShowProvisionalOrderModal,
        handleResolveIncidentalCase: input.handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision: input.handleUpdateIncidentalEntryDecision,
        setShowIncidentalModal: flags.setShowIncidentalModal,
        setShowDocModal: flags.setShowDocModal,
        setShowApptModal: flags.setShowApptModal,
        setIsActionsMenuOpen: flags.setIsActionsMenuOpen,
        handleQuickAction: input.handleQuickAction,
        setShowPauseModal: flags.setShowPauseModal,
        setShowResumeInterruptionModal: flags.setShowResumeInterruptionModal,
        setShowAbandonmentRenewalModal: flags.setShowAbandonmentRenewalModal,
        setShowPauseResumeModal: flags.setShowPauseResumeModal,
        setShowNotificationModal: flags.setShowNotificationModal,
        setShowPaymentModal: flags.setShowPaymentModal,
        setParentData: input.setParentData,
        setShowTaskModal: flags.setShowTaskModal,
        handleToggleTask: input.handleToggleTask,
        handleAppealBriefFile: input.handleAppealBriefFile,
        handleAppealBriefOutcome: input.handleAppealBriefOutcome,
        handleCorrespondenceResponse: input.handleCorrespondenceResponse,
        setEditingTask: flags.setEditingTask,
        setEditingFastTrack: flags.setEditingFastTrack,
        setShowFastTrackModal: flags.setShowFastTrackModal,
        setEditingAttachment: flags.setEditingAttachment,
        setShowAttachmentModal: flags.setShowAttachmentModal,
        handleDeleteEvent: input.handleDeleteEvent,
        handleEditEvent: input.handleEditEvent,
        handleAddAction: input.handleAddAction,
        handleSaveFastTrack: input.handleSaveFastTrack,
        editingEvent: input.flags.editingEvent,
        setEditingEvent: input.flags.setEditingEvent,
        setShowCrossAppealModal: flags.setShowCrossAppealModal,
        setShowJudgmentModal: flags.setShowJudgmentModal,
        handleCancelCrossAppeal: input.handleCancelCrossAppeal,
        handleAddCrossAppeal: input.handleAddCrossAppeal,
        stepperStages: input.stepperStages,
        currentStageId: input.currentStageId,
        onOpenLinkedFile: input.onOpenLinkedFile,
        lawsuitFiles: input.lawsuitFiles,
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
        showApptModal: flags.showApptModal,
        setShowApptModal: flags.setShowApptModal,
        showPauseModal: flags.showPauseModal,
        setShowPauseModal: flags.setShowPauseModal,
        showInterruptionModal: flags.showInterruptionModal,
        setShowInterruptionModal: flags.setShowInterruptionModal,
        showResumeInterruptionModal: flags.showResumeInterruptionModal,
        setShowResumeInterruptionModal: flags.setShowResumeInterruptionModal,
        showAbandonmentRenewalModal: flags.showAbandonmentRenewalModal,
        setShowAbandonmentRenewalModal: flags.setShowAbandonmentRenewalModal,
        showPauseResumeModal: flags.showPauseResumeModal,
        setShowPauseResumeModal: flags.setShowPauseResumeModal,
        showInterlocutoryModal: flags.showInterlocutoryModal,
        setShowInterlocutoryModal: flags.setShowInterlocutoryModal,
        showObjectionRegistrationModal: flags.showObjectionRegistrationModal,
        setShowObjectionRegistrationModal: flags.setShowObjectionRegistrationModal,
        showObjectionJudgmentModal: flags.showObjectionJudgmentModal,
        setShowObjectionJudgmentModal: flags.setShowObjectionJudgmentModal,
        showAbsentJudgmentNotificationModal: flags.showAbsentJudgmentNotificationModal,
        setShowAbsentJudgmentNotificationModal: flags.setShowAbsentJudgmentNotificationModal,
        showOpponentAbsentObjectionModal: flags.showOpponentAbsentObjectionModal,
        setShowOpponentAbsentObjectionModal: flags.setShowOpponentAbsentObjectionModal,
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
        showCaseLinkModal: flags.showCaseLinkModal,
        setShowCaseLinkModal: flags.setShowCaseLinkModal,
        showCorrespondenceModal: flags.showCorrespondenceModal,
        setShowCorrespondenceModal: flags.setShowCorrespondenceModal,
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
        appealOutcomeTask: flags.appealOutcomeTask,
        setAppealOutcomeTask: flags.setAppealOutcomeTask,
        pauseReason: input.pauseReason,
        linkedCaseNo: input.linkedCaseNo,
        interruptionData: input.interruptionData,
        deletedEvents: input.deletedEvents,
        displayStage: input.displayStage,
        currentStage: input.currentStage,
        stages: input.stages,
        activeStageIndex: input.activeStageIndex,
        viewingStageIndex: input.viewingStageIndex,
        parentData: input.parentData,
        lawsuitFile: input.file,
        consolidationCurrentFileId: input.consolidationCurrentFileId,
        consolidationCurrentCaseNo: input.consolidationCurrentCaseNo,
        consolidationCurrentClientName: input.consolidationCurrentClientName,
        consolidationCurrentCourt: input.consolidationCurrentCourt,
        consolidationCurrentStageLabel: input.consolidationCurrentStageLabel,
        consolidationCandidates: input.consolidationCandidates,
        onConsolidationCreateNew: input.onConsolidationCreateNew,
        onConsolidationMergeExisting: input.onConsolidationMergeExisting,
        onConsolidationExternalRef: input.onConsolidationExternalRef,
        caseLinkCurrentFileId: input.caseLinkCurrentFileId,
        caseLinkCurrentCaseNo: input.caseLinkCurrentCaseNo,
        caseLinkCandidates: input.caseLinkCandidates,
        onCaseLinkExisting: input.onCaseLinkExisting,
        onCaseLinkExternal: input.onCaseLinkExternal,
        handlers: input.handlers,
        appealRoute: resolveAppealRouteForDossier(input),
        modalVisualVariant: (isPersonalStatusFile(input.file) ? 'personal-pearl' : 'civil') as SmartFileModalVisualVariant,
    };
}

export function buildSmartFileLayoutProps(input: SmartFileLayoutBuildInput): SmartFileLayoutProps {
    return {
        chrome: buildChromeProps(input),
        mainPanel: buildMainPanelProps(input),
        modalsPortal: buildModalsPortalProps(input),
    };
}
