import type { SmartFileModalsPortalProps } from '../layout/SmartFileModalsPortal';
import {
    findFirstInstanceBasisStage,
    pickQuantifiedClaimValue,
    readPersistedClaimValue,
    resolveAppealRouteContext,
} from './appealRouteEligibility';
import { readFileDetailsField } from '../layout/mainPanel/smartFileMainPanelUtils';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { SmartFileModalVisualVariant } from './smartFileModalTheme';
import type { SmartFileLayoutBuildInput } from './viewPropsTypes';

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
